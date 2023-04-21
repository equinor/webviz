// vite.config.ts
import react from "file:///home/ruben/repos/webviz/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import { defineConfig } from "file:///home/ruben/repos/webviz/frontend/node_modules/vite/dist/node/index.js";
import glsl from "file:///home/ruben/repos/webviz/frontend/node_modules/vite-plugin-glsl/src/index.js";

// aliases.json
var aliases_default = {
  compilerOptions: {
    paths: {
      "@api": ["./src/api"],
      "@framework/*": ["./src/framework/*"],
      "@lib/*": ["./src/lib/*"],
      "@modules/*": ["./src/modules/*"]
    }
  }
};

// vite.config.ts
var __vite_injected_original_dirname = "/home/ruben/repos/webviz/frontend";
var paths = {
  public: "./public",
  publicHtmlFile: "./index.html",
  root: "./src"
};
var vite_config_default = defineConfig({
  plugins: [react(), glsl()],
  build: {
    rollupOptions: {
      input: {
        app: paths.publicHtmlFile
      }
    }
  },
  resolve: {
    alias: Object.keys(aliases_default.compilerOptions.paths).reduce(
      (prev, current) => ({
        ...prev,
        [current.replace("/*", "")]: path.resolve(
          __vite_injected_original_dirname,
          aliases_default.compilerOptions.paths[current][0].replace("/*", "")
        )
      }),
      {}
    )
  },
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: "http://backend:5000",
        rewrite: (path2) => path2.replace(/^\/api/, "")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAiYWxpYXNlcy5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcnViZW4vcmVwb3Mvd2Vidml6L2Zyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydWJlbi9yZXBvcy93ZWJ2aXovZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnViZW4vcmVwb3Mvd2Vidml6L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBnbHNsIGZyb20gXCJ2aXRlLXBsdWdpbi1nbHNsXCI7XG5cbmltcG9ydCBhbGlhc2VzIGZyb20gXCIuL2FsaWFzZXMuanNvblwiO1xuXG5jb25zdCBwYXRocyA9IHtcbiAgICBwdWJsaWM6IFwiLi9wdWJsaWNcIixcbiAgICBwdWJsaWNIdG1sRmlsZTogXCIuL2luZGV4Lmh0bWxcIixcbiAgICByb290OiBcIi4vc3JjXCIsXG59O1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgZ2xzbCgpXSxcbiAgICBidWlsZDoge1xuICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICAgIGFwcDogcGF0aHMucHVibGljSHRtbEZpbGUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczogT2JqZWN0LmtleXMoYWxpYXNlcy5jb21waWxlck9wdGlvbnMucGF0aHMpLnJlZHVjZShcbiAgICAgICAgICAgIChwcmV2LCBjdXJyZW50KSA9PiAoe1xuICAgICAgICAgICAgICAgIC4uLnByZXYsXG4gICAgICAgICAgICAgICAgW2N1cnJlbnQucmVwbGFjZShcIi8qXCIsIFwiXCIpXTogcGF0aC5yZXNvbHZlKFxuICAgICAgICAgICAgICAgICAgICBfX2Rpcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGFsaWFzZXMuY29tcGlsZXJPcHRpb25zLnBhdGhzW2N1cnJlbnRdWzBdLnJlcGxhY2UoXCIvKlwiLCBcIlwiKVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHt9XG4gICAgICAgICksXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgcG9ydDogODA4MCxcbiAgICAgICAgcHJveHk6IHtcbiAgICAgICAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly9iYWNrZW5kOjUwMDBcIixcbiAgICAgICAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgXCJcIiksXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiIsICJ7XG4gICAgXCJjb21waWxlck9wdGlvbnNcIjoge1xuICAgICAgICBcInBhdGhzXCI6IHtcbiAgICAgICAgICAgIFwiQGFwaVwiOiBbXCIuL3NyYy9hcGlcIl0sXG4gICAgICAgICAgICBcIkBmcmFtZXdvcmsvKlwiOiBbXCIuL3NyYy9mcmFtZXdvcmsvKlwiXSxcbiAgICAgICAgICAgIFwiQGxpYi8qXCI6IFtcIi4vc3JjL2xpYi8qXCJdLFxuICAgICAgICAgICAgXCJAbW9kdWxlcy8qXCI6IFtcIi4vc3JjL21vZHVsZXMvKlwiXVxuICAgICAgICB9XG4gICAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxUixPQUFPLFdBQVc7QUFFdlMsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sVUFBVTs7O0FDSmpCO0FBQUEsRUFDSSxpQkFBbUI7QUFBQSxJQUNmLE9BQVM7QUFBQSxNQUNMLFFBQVEsQ0FBQyxXQUFXO0FBQUEsTUFDcEIsZ0JBQWdCLENBQUMsbUJBQW1CO0FBQUEsTUFDcEMsVUFBVSxDQUFDLGFBQWE7QUFBQSxNQUN4QixjQUFjLENBQUMsaUJBQWlCO0FBQUEsSUFDcEM7QUFBQSxFQUNKO0FBQ0o7OztBRFRBLElBQU0sbUNBQW1DO0FBUXpDLElBQU0sUUFBUTtBQUFBLEVBQ1YsUUFBUTtBQUFBLEVBQ1IsZ0JBQWdCO0FBQUEsRUFDaEIsTUFBTTtBQUNWO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsU0FBUyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFBQSxFQUN6QixPQUFPO0FBQUEsSUFDSCxlQUFlO0FBQUEsTUFDWCxPQUFPO0FBQUEsUUFDSCxLQUFLLE1BQU07QUFBQSxNQUNmO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE9BQU8sT0FBTyxLQUFLLGdCQUFRLGdCQUFnQixLQUFLLEVBQUU7QUFBQSxNQUM5QyxDQUFDLE1BQU0sYUFBYTtBQUFBLFFBQ2hCLEdBQUc7QUFBQSxRQUNILENBQUMsUUFBUSxRQUFRLE1BQU0sRUFBRSxDQUFDLEdBQUcsS0FBSztBQUFBLFVBQzlCO0FBQUEsVUFDQSxnQkFBUSxnQkFBZ0IsTUFBTSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsTUFBTSxFQUFFO0FBQUEsUUFDOUQ7QUFBQSxNQUNKO0FBQUEsTUFDQSxDQUFDO0FBQUEsSUFDTDtBQUFBLEVBQ0o7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNILFFBQVE7QUFBQSxRQUNKLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQ0EsVUFBU0EsTUFBSyxRQUFRLFVBQVUsRUFBRTtBQUFBLE1BQ2hEO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
