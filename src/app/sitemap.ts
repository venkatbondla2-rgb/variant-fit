import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: "https://variant-fit.vercel.app",
            lastModified: new Date(),
        },
        {
            url: "https://variant-fit.vercel.app/feed",
            lastModified: new Date(),
        },
        {
            url: "https://variant-fit.vercel.app/diet",
            lastModified: new Date(),
        },
        {
            url: "https://variant-fit.vercel.app/exercises",
            lastModified: new Date(),
        },
        {
            url: "https://variant-fit.vercel.app/community",
            lastModified: new Date(),
        },
        {
            url: "https://variant-fit.vercel.app/leaderboard",
            lastModified: new Date(),
        },
        {
            url: "https://variant-fit.vercel.app/premium",
            lastModified: new Date(),
        },
    ];
}