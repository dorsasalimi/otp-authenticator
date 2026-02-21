// time.ts
import { Request, Response } from 'express';

export const serverTimeHandler = (req: Request, res: Response) => {
  res.json({ 
    serverTime: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone 
  });
};