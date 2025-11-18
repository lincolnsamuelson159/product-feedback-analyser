import dotenv from 'dotenv';
import { discoverCustomFields } from './jira/field-discovery';

// Load environment variables
dotenv.config();

const config = {
  url: process.env.JIRA_URL!,
  email: process.env.JIRA_EMAIL!,
  apiToken: process.env.JIRA_API_TOKEN!,
  boardId: process.env.JIRA_BOARD_ID!
};

discoverCustomFields(config);
