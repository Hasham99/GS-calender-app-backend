import bcrypt from "bcrypt"

const hashPassword = async (password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        return hashedPassword
    } catch (error) {

    }
}
const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword)
    } catch (error) {

    }
}

export { hashPassword, comparePassword }