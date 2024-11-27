import bcrypt from "bcrypt";

export const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);  // Salt rounds set to 10
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;  // Throw error if bcrypt hashing fails
    }
};

export const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);  // Compare the plain text password with the hashed one
    } catch (error) {
        console.error("Error comparing passwords:", error);
        throw error;  // Propagate the error if something goes wrong
    }
};

