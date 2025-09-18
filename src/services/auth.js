import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import handlebars from 'handlebars';

import {
  accessTokenLifeTime,
  refreshTokenLifeTime,
} from '../constants/auth.js';
import { SessionsCollection } from '../db/models/session.js';
import { UserCollection } from '../db/models/user.js';
import { getEnvVar } from '../utils/getEnvVar.js';
import { sendEmail } from '../utils/sendEmail.js';
import { TEMPLATES_DIR } from '../constants/index.js';

const createSession = () => ({
  accessToken: randomBytes(30).toString('base64'),
  refreshToken: randomBytes(30).toString('base64'),
  accessTokenValidUntil: new Date(Date.now() + accessTokenLifeTime),
  refreshTokenValidUntil: new Date(Date.now() + refreshTokenLifeTime),
});

export const findSession = (query) => SessionsCollection.findOne(query);
export const findUser = (query) => UserCollection.findOne(query);

const jwtSecret = getEnvVar('JWT_SECRET');
const appDomain = getEnvVar('APP_DOMAIN');

export const registerUser = async (data) => {
  const { email, password } = data;

  const user = await UserCollection.findOne({ email });
  if (user) {
    throw createHttpError(409, 'Email already in use');
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const newUser = await UserCollection.create({
    ...data,
    password: hashPassword,
  });

  return {
    name: newUser.name,
    email: newUser.email,
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await UserCollection.findOne({ email });
  if (!user) {
    throw createHttpError(401, 'User not found');
  }

  const isEqual = await bcrypt.compare(password, user.password);
  if (!isEqual) {
    throw createHttpError(401, 'Unauthorized');
  }

  await SessionsCollection.deleteOne({ userId: user._id });

  const session = createSession();

  return await SessionsCollection.create({
    userId: user._id,
    ...session,
  });
};

export const refreshUsersSession = async ({ sessionId, refreshToken }) => {
  const oldSession = await findSession({ _id: sessionId, refreshToken });
  if (!oldSession) {
    throw createHttpError(401, 'Session not found');
  }

  if (oldSession.refreshTokenValidUntil < new Date()) {
    throw createHttpError(401, 'Session token expired');
  }

  await SessionsCollection.findByIdAndDelete(oldSession._id);

  const newSession = createSession();

  return await SessionsCollection.create({
    userId: oldSession.userId,
    ...newSession,
  });
};

export const logoutUser = async (sessionId) => {
  await SessionsCollection.deleteOne({ _id: sessionId });
};

export const sendResetToken = async (email) => {
  const user = await UserCollection.findOne({ email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const resetToken = jwt.sign(
    {
      sub: user._id,
      email,
    },
    jwtSecret,
    {
      expiresIn: '15m',
    },
  );

  const resetPasswordTemplatePath = path.join(
    TEMPLATES_DIR,
    'reset-password-email.html',
  );

  const resetTemplateSource = await readFile(
    resetPasswordTemplatePath,
    'utf-8',
  );

  const template = handlebars.compile(resetTemplateSource);
  const html = template({
    name: user.name,
    resetLink: `${appDomain}/reset-password?token=${resetToken}`,
  });

  await sendEmail({
    from: getEnvVar(SMTP.SMTP_FROM),
    to: email,
    subject: 'Reset your password',
    html,
  });
};

export const resetPassword = async (payload) => {
  let entries;
  try {
    entries = jwt.verify(payload.token, jwtSecret);
  } catch (error) {
    if (err instanceof Error) throw createHttpError(401, err.message);
    throw err;
  }

  const user = UserCollection.findOne({
    email: entries.email,
    _id: entries.sub,
  });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const encryptedPassword = await bcrypt.hash(payload.password, 10);

  await UserCollection.updateOne(
    { _id: user._id },
    { password: encryptedPassword },
  );
};
