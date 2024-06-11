<script setup lang="ts">
import { sendMessage } from "webext-bridge/popup";

const handleHighlight = async () => {
  const tab = await sendMessage(
    "get-current-tab",
    {
      tabId: 0,
    },
    "background"
  );

  if (tab.id === undefined) {
    return;
  }

  sendMessage("get-text-highlight", null, {
    context: "content-script",
    tabId: tab?.id,
  });
};
</script>

<template>
  <main class="w-[100px] px-4 py-5 text-center text-gray-700">
    <button class="btn" @click="handleHighlight">Run</button>
  </main>
</template>
