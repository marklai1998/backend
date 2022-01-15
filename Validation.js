const yup = require("yup");

const validateUser = yup.object().shape({
  username: yup
    .string()
    .typeError("Invalid Username")
    .required("Specify Username"),
  password: yup
    .string()
    .typeError("Invalid Password")
    .required("Specify Password"),
});
const validateDistrict = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
});
const validateBlock = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
  blockID: yup
    .number()
    .typeError("Invalid blockID")
    .min(1, "blockID must at least be 1")
    .required("Specify a blockID"),
});
const validateBlockUpdate = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
  blockID: yup
    .number()
    .typeError("Invalid blockID")
    .min(1, "blockID must at least be 1")
    .required("Specify a blockID"),
  progress: yup
    .number()
    .typeError("Invlaid progress")
    .min(0, "Progress can't be below 0%")
    .max(100, "Progress can't be above 100%")
    .required("Specify progress"),
  details: yup.boolean("Details must be a boolean").required("Specify Details"),
  builder: yup
    .string()
    .typeError("Invalid builder")
    .matches(/^([a-zA-Z0-9_]{3,16}[,]?){1,}$/, {
      excludeEmptyString: true,
      message: "Invalid Minecraft-Name found or not separated with a comma",
    })
    .required("Specified Builder"),
});
const validateProgress = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
  blockID: yup
    .number()
    .typeError("Invalid blockID")
    .min(1, "blockID must at least be 1")
    .required("Specify a blockID"),
  progress: yup
    .number()
    .typeError("Invlaid progress")
    .min(0, "Progress can't be below 0%")
    .max(100, "Progress can't be above 100%")
    .required("Specify Progress"),
});
const validateDetails = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
  blockID: yup
    .number()
    .typeError("Invalid blockID")
    .min(1, "blockID must at least be 1")
    .required("Specify a blockID"),
  details: yup
    .boolean()
    .typeError("Details must be a boolean")
    .required("Specify Details"),
});
const validateDistrictUpdateAdmin = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
  status: yup
    .number()
    .typeError("Invalid status")
    .min(0, "Status has to be between 0 and 4")
    .max(4, "Status has to be between 0 and 4"),
  blocksDone: yup
    .number()
    .typeError("Invalid BlocksDone")
    .min(0, "Blocks Done can't be below 0"),
  blocksLeft: yup
    .number()
    .typeError("Invalid BlocksLeft")
    .min(0, "Blocks Left can't be below 0"),
  progress: yup
    .number()
    .typeError("Invlaid progress")
    .min(0, "Progress can't be below 0%")
    .max(100, "Progress can't be above 100%"),
  completionDate: yup
    .string()
    .typeError("Invalid Date")
    .matches(
      /^\s*(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})\s*$/,
      { excludeEmptyString: true, message: "Invalid Date Format (dd.MM.yyyy)" }
    ),
  image: yup.string().typeError("Invalid Image").url("Invalid URL"),
  map: yup.string().typeError("Invalid Map").url("Invalid URL"),
  parent: yup.string().typeError("Invalid Parent"),
  location: yup.string().typeError("Invalid Location"),
  about: yup.string().typeError("Invalid about text"),
});
const validateBlockUpdateAdmin = yup.object().shape({
  district: yup
    .string()
    .typeError("Invalid district name")
    .required("Specify a district"),
  blockID: yup
    .number()
    .typeError("Invalid blockID")
    .min(1, "blockID must at least be 1")
    .required("Specify a blockID"),
  location: yup.string().typeError("Invalid Location"),
  status: yup
    .number()
    .typeError("Invalid status")
    .min(0, "Status has to be between 0 and 4")
    .max(4, "Status has to be between 0 and 4"),
  progress: yup
    .number()
    .typeError("Invlaid progress")
    .min(0, "Progress can't be below 0%")
    .max(100, "Progress can't be above 100%"),
  details: yup.boolean().typeError("Details must be a boolean"),
  builder: yup
    .string()
    .typeError("Invalid builder")
    .matches(/^([a-zA-Z0-9_]{3,16}[,]?){1,}$/, {
      excludeEmptyString: true,
      message: "Invalid Minecraft-Name found or not separated with a comma",
    }),
  completionDate: yup
    .string()
    .typeError("Invalid Date")
    .matches(
      /^\s*(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})\s*$/,
      { excludeEmptyString: true, message: "Invalid Date Format (dd.MM.yyyy)" }
    ),
});

module.exports = {
  validateUser,
  validateDistrict,
  validateBlock,
  validateBlockUpdate,
  validateProgress,
  validateDetails,
  validateDistrictUpdateAdmin,
  validateBlockUpdateAdmin,
};
