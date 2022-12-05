const getSamples = require("./getSamples");
const insertSample = require("./insertSample");
const { getCars, getProfiles, getSurveyors } = require("./getrds");

module.exports = {
  insertSample,
  getSamples,
  getCars,
  getProfiles,
  getSurveyors,
};
