import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://frogger-six.vercel.app",
      lastModified: new Date(),
    },
  ];
}
