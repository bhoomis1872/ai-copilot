const express =
  require("express");

const jwt =
  require("jsonwebtoken");

const router =
  express.Router();

router.post(
  "/",
  async (req, res) => {

    const {
      username,
      password
    } = req.body;

    // DEMO LOGIN
    if (
      username === "admin" &&
      password === "admin123"
    ) {

      const token =
        jwt.sign(

          {
            user: username
          },

          process.env.JWT_SECRET,

          {
            expiresIn: "1d"
          }
        );

      return res.json({
        token
      });
    }

    return res
      .status(401)
      .json({
        error:
          "Invalid credentials"
      });
  }
);

module.exports =
  router;