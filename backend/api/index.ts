import mongoose from 'mongoose';
import app from '../src/app';
import { connectDB } from '../src/shared/config/db';

let connectPromise: Promise<void> | null = null;

async function ensureDbConnection(): Promise<void> {
	if (mongoose.connection.readyState === 1) {
		return;
	}

	if (!connectPromise) {
		connectPromise = connectDB().finally(() => {
			connectPromise = null;
		});
	}

	await connectPromise;
}

export default async function handler(req: any, res: any): Promise<void> {
	await ensureDbConnection();
	app(req, res);
}