const { google } = require("googleapis");

const sheetID = "1Hmf3KCHCEsLxYrlW-RNQK0LxqD0_ItzFx4zimpnOzMw";
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: "euhfehjsdbfz4z8iekbIZIjnz4i",
  baseURL: "http://localhost:8080",
  clientID: "5K0ji4rnMs5OzRoU81c7wmCehz6uX2yP",
  issuerBaseURL: "https://minefactprogress.eu.auth0.com",
};
const authGoogle = new google.auth.GoogleAuth({
  keyFile: "cred.json",
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});
async function getClientGoogle() {
  return await authGoogle.getClient();
}
const googleSheets = google.sheets({ version: "v4", auth: getClientGoogle });

export { googleSheets, sheetID, authGoogle };
