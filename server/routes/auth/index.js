import {Router} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {check, validationResult} from "express-validator";

import {secretJwt} from "../../config";
import User from "../../models/Users";
import {sendMail} from "../../common/mailer"

const router = Router();

/**
 * @swagger
 * /v1/api/auth/sign-up:
 *   post:
 *     tags:
 *       - Auth
 *     description: Sign-up in app
 *     produces:
 *       - application/json
 *     parameters:
 *       - firstName: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *       - laststName: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *       - email: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *       - password: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *       - re_password: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       201:
 *         description: Updated certification
 *       401:
 *         description: Update failed, user not authorized.
 *       404:
 *         description: Update failed, entity not found.
 *       400:
 *         description: Update failed, validate exception.
 */
router.post('/sign-up',
[
  check("email", "Email isn't correct").isEmail(),
  check("password", "Min length of password is 6").isLength({min:6})
],
async (req,res)=>{
  try{
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Data isn't correct by register"
      })
    }

    const {email, password, firstName, lastName}=req.body; 
    const candidate = await User.findOne({email})     
        
    if(candidate){
      return res.status(400).json({message: "Email is used"})
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({firstName, lastName, email, password: hashedPassword});

    await user.save();
    
    const dataEmail = {
      email,
      subject: 'Congratulations! You have registered on our "Site"!', 
      template: `Your email: ${user.email}
      Your password: ${password}`
    }
    
    sendMail(dataEmail);

    const dataAdminEmail = {
      email,
      subject: 'Congratulations! Another user registered on our "Site"!', 
      template: `
      name: ${user.firstName}
      lastName: ${user.lastName}
      email: ${user.email}
      password: ${password}`
    }

    sendMail(dataAdminEmail);
    
    res.status(201).json({message: "User was created"})

  }catch (err) {
    res.status(500).json({message:"Error 500", errors: err})
  }
})

/**
 * @swagger
 * /v1/api/auth/sign-in:
 *   post:
 *     tags:
 *       - Auth
 *     description: Sign-in your profile
 *     produces:
 *       - application/json
 *     parameters:
 *       - email: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *       - password: id
 *         description: Certification id.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       201:
 *         description: Updated certification
 *       401:
 *         description: Update failed, user not authorized.
 *       404:
 *         description: Update failed, entity not found.
 *       400:
 *         description: Update failed, validate exception.
 */
router.post('/sign-in',
[
  check("email", "Enter correct email").normalizeEmail().isEmail(),
  check("password", "Enter password").exists()
], 
async (req,res)=>{
  try{
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Enter into system isn't correct"
      })
    }

    const {email, password}=req.body;
    const user = await User.findOne({email});
    
    if(!user){
      return res.status(400).json({message: "User not found"})
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if(!isMatch){
      return res.status(400).json({message: "Enter correct password"})
    }

    const token = jwt.sign(
      {userId: user.id},
      secretJwt,
      {expiresIn:"1h"}
    )

    res.json({token, userId: user.id})
  }catch (err) {
    res.status(500).json({message:"Error 500", errors: err})
  }
})

router.post('/reset-password', async (req,res)=>{
  try{
    if(!req.body.email){
      return res.status(400).json({message: "User not found"})
    }
    const {email}=req.body; 
    const user = await User.findOne({email});

    if(!user){
      return res.status(400).json({message: "Email is not found"})
    }

    const dataEmail = {
      email,
      subject: "Reset Password!", 
      template: `Your password: ${user.password}`
    }

    sendMail(dataEmail);

    res.json({reseted: true});
  }catch(err){
    res.status(500).json({message:"Error 500", errors: err})
  }
  
})

router.post('login', async (req,res)=>{})

export default router;