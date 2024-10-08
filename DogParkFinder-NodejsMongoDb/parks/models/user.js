const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
 username: {
   type: String,
   required: true,
   unique: true
 },
 password: {
   type: String,
   required: true
 }
});
// userSchema.pre('save', async function(next) {
//  try {
//    const salt = await bcrypt.genSalt(10);
//    const hashedPassword = await bcrypt.hash(this.password, salt);
//    this.password = hashedPassword;
//    next();
//  } catch (error) {
//    next(error);
//  }
// });
// const User = mongoose.model('User', userSchema);
// module.exports = User;
module.exports = mongoose.model('User',userSchema);