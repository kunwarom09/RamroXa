import dotenv from 'dotenv';
dotenv.config();

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/zylo_ecommerce",
    options: {}
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'esm'
};

export default config;
