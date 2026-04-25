SHELL := /bin/zsh

.PHONY: help install fe be dev db review build

help:
	@echo "Available commands:"
	@echo "  make install  Install frontend/backend dependencies"
	@echo "  make fe       Start Next.js frontend on localhost:5556"
	@echo "  make be       Start FastAPI backend on localhost:7778"
	@echo "  make dev      Start frontend and backend together"
	@echo "  make db       Print Supabase schema path and setup notes"
	@echo "  make review   Run Next.js build and Python compile checks"
	@echo "  make build    Build frontend"

install:
	npm install
	npm run install:all

fe:
	npm --prefix frontend run dev

be:
	cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 7778 --reload

dev:
	npm run dev

db:
	@echo "Run this SQL in Supabase SQL editor:"
	@echo "  /Users/yigit/codes/kom/backend/sql/schema.sql"
	@echo ""
	@echo "Create these Supabase Storage buckets:"
	@echo "  body-uploads        private"
	@echo "  avatar-generations  public"
	@echo ""
	@echo "Then fill:"
	@echo "  /Users/yigit/codes/kom/backend/.env"
	@echo "  /Users/yigit/codes/kom/frontend/.env.local"

review:
	npm run review

build:
	npm --prefix frontend run build
