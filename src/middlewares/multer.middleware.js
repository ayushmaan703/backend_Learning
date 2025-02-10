import multer from "multer"
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname) //we can change this to a code that generates a unique filename everytime (this can be found out in the documentation of mmulter or i have directly pasted it below )
    },
})
// file.fieldname + '-' + Date.now() + path.extname(file.originalname)
export const upload = multer({
    storage,
})

/*
(code to genrate unique filename not doing this as file stays in the server for a very short time and if file with same name come they will not be overwritting due to same name)
(below code is from the documentation of multer)
code--->
filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
  <-----
*/
