import dotenv from 'dotenv';
dotenv.config();

export const mongodb = {
  url: process.env.MONGODB_URI || "mongodb://localhost:27017/zylo_ecommerce",
  options: {}
};
export const migrationsDir = "migrations";
export const changelogCollectionName = "changelog";
export const migrationFileExtension = ".js";
export const useFileHash = false;
export const moduleSystem = 'esm';

const config = {
  mongodb,
  migrationsDir,
  changelogCollectionName,
  migrationFileExtension,
  useFileHash,
  moduleSystem
};

export default config;

