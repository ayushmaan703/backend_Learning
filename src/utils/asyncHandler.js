const asyncHandler = (functionToBeHandled)=>async(req,res,next)=>{
    try{
      await functionToBeHandled(req,res,next)
    }
    catch(error){
        res.status(500).json({
            success : false,
            message : error.message
        })
    }
}
export {asyncHandler}

// const asyncHandler = (requestHandler) => {
//     return (req, res, next) => {
//         Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
//     }
// }


// export { asyncHandler }

