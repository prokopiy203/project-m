import { Router } from 'express';
import {
  deleteUserArticleController,
  getUserAllSavedArticle,
  getUserCreatedStoriesController,
  getUserInfoController,
  saveUserArticleController,
  updateAvatarController,
} from '../controllers/users.js';
import { authenticate } from '../middlewares/authenticate.js';
import { onboardingController } from '../controllers/users.js';
import { onboardingCompletedSchema } from '../validation/auth.js';
import { validateBody } from '../middlewares/validateBody.js';
import { avatarUpload } from '../middlewares/multer.js';

const userRouter = Router();

userRouter.get('/info', authenticate, getUserInfoController);

userRouter.patch(
  '/onboarding',
  validateBody(onboardingCompletedSchema),
  onboardingController,
);

userRouter.patch(
  '/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  updateAvatarController,
);

userRouter.post('/save-story/:id', authenticate, saveUserArticleController);

userRouter.delete('/save-story/:id', authenticate, deleteUserArticleController);

userRouter.get('/saved-stories', authenticate, getUserAllSavedArticle);

userRouter.get(
  '/created-stories',
  authenticate,
  getUserCreatedStoriesController,
);

export default userRouter;
