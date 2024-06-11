import { useFetch } from "@vueuse/core";
import { onMessage, sendMessage } from "webext-bridge/background";
import type { Tabs } from "webextension-polyfill";

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import("/@vite/client");
  // load latest content script
  import("./contentScriptHMR");
}

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log("Extension installed");
});

let previousTabId = 0;

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId;
    return;
  }

  let tab: Tabs.Tab;

  try {
    tab = await browser.tabs.get(previousTabId);
    previousTabId = tabId;
  } catch {
    return;
  }

  // eslint-disable-next-line no-console
  console.log("previous tab", tab);
  sendMessage(
    "tab-prev",
    { title: tab.title },
    { context: "content-script", tabId }
  );
});

onMessage("get-current-tab", async () => {
  try {
    const tab = await browser.tabs.get(previousTabId);
    return {
      title: tab?.title,
      id: tab?.id,
    };
  } catch {
    return {
      title: undefined,
      id: undefined,
    };
  }
});

onMessage("get-named-entity", async ({ data }) => {
  console.log("data", data);

  try {
    const res = await fetch("http://127.0.0.1:8000/ner", {
      method: "POST",
      // @ts-ignore
      body: JSON.stringify({ text: data?.data }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await res.json();

    return result;
  } catch (error) {
    console.error("get-named-entity error", error);
  }
});
