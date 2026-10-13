export const up = async (db, client) => {
  // Ensure index on capacity for variants
  try {
    await db.collection('variants').createIndex({ capacity: 1 }, { sparse: true });
  } catch (err) {
    console.warn('Migration up warning on variants capacity index:', err.message);
  }
};

export const down = async (db, client) => {
  try {
    await db.collection('variants').dropIndex('capacity_1');
  } catch (e) {}
};
