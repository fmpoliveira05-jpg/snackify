const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token não fornecido!" });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Token não encontrado!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userType = decoded.userType;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido!" });
    }
};

module.exports = authMiddleware;