import { Client, Account, Avatars, Databases, Teams, Storage } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('669cbafc001a06e0c089');

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const roles = new Teams(client);
const storage = new Storage(client);

export { account, client, avatars, databases, roles, storage };