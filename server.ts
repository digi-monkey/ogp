import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.15-alpha/deno-dom-wasm.ts";

import LRU from "https://deno.land/x/lru@1.0.2/mod.ts";

const lru = new LRU<Map<string, string>>(100);

async function getMetadata(url: string) {
  const map = new Map();
  // if (url.indexOf(":ogp.deno.dev") > 0) {
  //   return map;
  // }
  try {
    const cache = lru.get(url);
    if (cache) {
      console.log("return cache");
      return cache;
    }
    const response: Response = await fetch(url);
    const parser: DOMParser = new DOMParser();
    const document: HTMLDocument | null = parser.parseFromString(
      await response.text(),
      "text/html",
    );
    if (!document) {
      return map;
    }
    document.getElementsByTagName("meta").forEach((a) => {
      const name = a.attributes.getNamedItem("name");
      if (name && name.value?.startsWith("twitter:")) {
        const content = a.attributes.getNamedItem("content");
        map.set(name.value, content.value);
      }
      const property = a.attributes.getNamedItem("property");
      if (property && property.value?.startsWith("og:")) {
        const content = a.attributes.getNamedItem("content");
        map.set(property.value, content.value);
      }
    });
    console.log(map);
    lru.set(url, map);
    return map;
  } catch (error) {
    console.log(error.message);
    return map;
  }
}

function getMetaDataFromMap(url: string, map: Map<any, any>){
  let image = map.get("og:image") || map.get("twitter:image:src") || "";
  if (image.startsWith("/")) {
    const u = new URL(url);
    image = u.protocol + "//" + u.host + image;
  }
  const title = map.get("og:title") || map.get("twitter:title") || "";
  const description = map.get("og:description") || map.get("twitter:description") || "";
  const siteName = map.get("og:site_name") || map.get("twitter:site") || "";
  return {
    url,
    title,
    image,
    description,
    siteName
  }
}

async function handler(_req: Request): Promise<Response> {
  const url = "https://getalby.com/"
  const map = await getMetadata(url);
  console.log(map)
  const data = getMetaDataFromMap(url, map);
  const json = JSON.stringify(data);
  return new Response(json, {
    headers: { "Content-Type": "application/json" },
  });

}

serve(handler);
