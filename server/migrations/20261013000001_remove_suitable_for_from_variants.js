export const up = async (db, client) => {
  // Drop suitable_for field from all variants
  try {
    await db.collection('variants').updateMany(
      { suitable_for: { $exists: true } },
      { $unset: { suitable_for: "" } }
    );
  } catch (err) {
    console.warn('Migration up warning on removing suitable_for:', err.message);
  }
};

export const down = async (db, client) => {
  // Rollback does not need to restore dropped suitable_for data
};
