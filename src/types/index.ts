export interface IUser{
    _id: string;
    email: string;
    googleId: string;
    createdAt: string;
    updatedAt: string;
}

export interface IURL {
    _id: string;
    userId: string;
    longUrl: string;
    shortUrl: string;
    alias: string;
    topic?: string;
    clicks: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IAnalytics {
    _id: string;
    urlId: string;
    timestamp: Date;
    userAgent: string;
    ipAddress: string;
    geoLocation?: {
      country: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    osType: string;
    deviceType: string;
    uniqueVisitorId: string;
}