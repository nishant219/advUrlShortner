export interface CreateShortUrlRequest {
    longUrl: string;
    customAlias?: string;
    topic?: string;
}

export interface UrlAnalyticsResponse {
    totalClicks: number;
    uniqueUsers: number;
    clicksByDate: Array<{
      date: string;
      clicks: number;
    }>;
    osType: Array<{
      osName: string;
      uniqueClicks: number;
      uniqueUsers: number;
    }>;
    deviceType: Array<{
      deviceName: string;
      uniqueClicks: number;
      uniqueUsers: number;
    }>;
}