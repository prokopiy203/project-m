const allowedOrigins = [
  'http://localhost:5173',
  'https://plantains-app-dev.vercel.app', // dev
  'https://plantains-app-client.vercel.app', //product
  'https://project-m-7jdz.onrender.com', //backend swagger
];

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
