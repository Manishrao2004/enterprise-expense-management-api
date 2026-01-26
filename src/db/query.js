const pool = require("../config/db");

const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = query;
