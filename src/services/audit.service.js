const query = require("../db/query");

const logAudit = async (userId, action, entity, entityId) => {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id)
     VALUES ($1, $2, $3, $4)`,
    [userId, action, entity, entityId]
  );
};

module.exports = logAudit;
