[![Maintainability](https://qlty.sh/gh/Solvit-Africa-Training-Center/projects/MenyaLo-Backend/maintainability.svg)](https://qlty.sh/gh/Solvit-Africa-Training-Center/projects/MenyaLo-Backend)
[![Code Coverage](https://qlty.sh/gh/Solvit-Africa-Training-Center/projects/MenyaLo-Backend/coverage.svg)](https://qlty.sh/gh/Solvit-Africa-Training-Center/projects/MenyaLo-Backend)

# MenyaLo Backend

## Description

MenyaLo is a civic technology platform designed to make the Rwanda Law Gazette accessible, readable, and actionable. It empowers citizens, startups, schools, NGOs, and legal professionals by providing AI-generated law summaries, verified law firm engagement, and community-driven legal support.

This backend service powers MenyaLo’s RESTful APIs for user authentication, law management, firm and organization directories, community interaction, and AI-assisted legal interpretation.

---

## Features

### Citizen/User Capabilities

- Can register and login
- Has a personalized feed based on domain preferences
- Can browse, search, and sort the Rwanda Law Gazette (by origin, status, domain)
- Can prompt the AI assistant with legal scenarios
- Can browse, search, and sort law firms
- Can access the community hub
- Can post, comment, reply, upvote, and report in the community

### Organization Capabilities (e.g. startups, schools, NGOs)

- Can register and be verified
- Can login and manage their profile
- Can browse, search, and sort laws and firms
- Can prompt the AI assistant
- Can post in the community and receive replies from verified firms
- Can upvote and report abuse
- Has a personalized feed based on sector and domain preferences

### Law Firm Capabilities

- Can register and be verified by an admin
- Can login and manage their profile and specialties
- Can browse, search, and sort laws and firms
- Can prompt the AI assistant
- Can post legal insights and updates
- Can comment and reply in the community
- Can upvote and report abuse
- Can annotate laws with notes and flag poorly written posts
- Their posts are prioritized in feeds
- Can be recommended to organizations and citizens

### Admin Capabilities

- Can verify or reject law firm and organization registrations
- Can moderate reported posts and deactivate abusive accounts
- Can manage law ingestion and AI summary generation
- Can manage domain and origin classifications
- Can monitor platform activity and user engagement

---

## Technologies Used

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (via Sequelize ORM)
- **Testing**: Jest
- **Containerization**: Docker, Docker Compose
- **AI Integration**: RAG LLM using Rwanda Law Gazette as external source
- **Authentication**: JWT, and OAuth2 hybrid strategies
- **Environment Management**: Joi-based config validation

---

## Getting Started

To get started with the MenyaLo backend, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/Solvit-Africa-Training-Center/MenyaLo-Backend.git
   ```

2. Navigate to the project directory:

   ```bash
   cd menyalo-backend
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up environment variables:

   Copy the `.env.example` file to `.env` and `.env.docker.example` file to `.env.docker`, and then update the values as needed.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Run docker:

   -Run docker detached

   ```bash
   npm run docker:up
   ```

   -Run docker in the foreground

   ```bash
   docker-compose up
   ```

7. Run tests:

   ```bash
   npm run test
   ```

## API Documentation

API documentation is available at [MenyaLo API Docs](http://localhost:5001/docs/).
