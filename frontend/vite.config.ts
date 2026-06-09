import { defineConfig }
from "vite";

import react
from "@vitejs/plugin-react";

import path
from "path";

export default defineConfig({

  plugins: [react()],

  resolve: {

    alias: {

      "@":
        path.resolve(
          __dirname,
          "./src"
        )

    }

  },

  server: {

    proxy: {

      "/copilot": {

        target:
          "http://127.0.0.1:4004",

        changeOrigin: true,

        secure: false

      },

      "/upload": {

  target:
    "http://127.0.0.1:4004",

  changeOrigin: true,

  secure: false

},

    }

  }

});