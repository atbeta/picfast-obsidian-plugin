import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
	resolve: {
		alias: {
			// The real `obsidian` package ships types only — point tests at
			// a minimal runtime stub so plugin modules can be imported.
			obsidian: new URL("./tests/mocks/obsidian.ts", import.meta.url)
				.pathname,
		},
	},
});
