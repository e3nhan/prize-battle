FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/display/package.json packages/display/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY packages/ packages/
COPY tsconfig.base.json ./
RUN pnpm build

# Production
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/display/package.json packages/display/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/server/dist packages/server/dist
COPY --from=build /app/packages/client/dist packages/client/dist
COPY --from=build /app/packages/display/dist packages/display/dist

EXPOSE 8080
ENV PORT=8080
CMD ["node", "packages/server/dist/index.js"]
