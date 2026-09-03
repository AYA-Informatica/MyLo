# One image, two entry points: the API and the tooling that fills it.
#
# The corpus pipeline ships in the image on purpose. Loading a law, re-deriving
# a floor and running the review import are operational tasks that happen against
# the deployed database, not on someone's laptop pointed at production — and an
# image that can serve but not load makes the laptop the only way.
FROM node:22-slim AS base
WORKDIR /app

# Poppler and Tesseract are for the scanned issues. Older Gazette issues have no
# text layer, and without these they are simply unreachable rather than
# degraded. English traineddata only: Tesseract ships no Kinyarwanda model, and
# the English one reads Kinyarwanda glyphs because the alphabet is shared.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      poppler-utils tesseract-ocr tesseract-ocr-fra ca-certificates \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
COPY packages/db/package.json packages/db/
COPY packages/corpus/package.json packages/corpus/
COPY packages/pipeline/package.json packages/pipeline/
COPY packages/eval/package.json packages/eval/
# --ignore-scripts: husky has no work to do in an image and fails without git.
RUN npm ci --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The API refuses to start without calibrated score floors, which is deliberate:
# character BM25 always ranks something, so an uncalibrated floor gives every
# off-topic question a confident citation. That refusal must survive
# containerisation rather than being papered over with a default here.
RUN test -f packages/pipeline/out/score-floors.json \
 || (echo "score-floors.json missing — derive it before building" && exit 1)

# Runs as a non-root user. The process reads a corpus and answers questions; it
# has no reason to be able to write to its own image.
RUN useradd --system --uid 10001 mylo && chown -R mylo:mylo /app
USER mylo

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-strip-types", "apps/api/src/server.ts"]
