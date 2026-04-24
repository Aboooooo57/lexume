FROM python:3.12-slim AS base
WORKDIR /app

# --- Dependencies Stage ---
FROM base AS deps
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# --- Development Stage ---
# Used for local dev with docker-compose. Volumes will be mounted.
FROM base AS dev
COPY --from=deps /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
# Code is mounted via volume in docker-compose
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- Staging/Production Stage ---
# Final standalone image containing all code
FROM base AS staging
COPY --from=deps /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY . .
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
