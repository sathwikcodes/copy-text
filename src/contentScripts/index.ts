// /* eslint-disable no-console */
// import { onMessage, sendMessage } from "webext-bridge/content-script";
// import { createApp } from "vue";
// import App from "./views/App.vue";
// import { setupApp } from "~/logic/common-setup";

// // Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
// (() => {
//   let companiesWithDetails;

//   onMessage("get-text-highlight", async () => {
//     companiesWithDetails = await sendMessage(
//       "get-named-entity",
//       {
//         data: document.body.innerText,
//       },
//       "background"
//     );

//     // result from background script

//     //   [
//     //     {
//     //         "entity": "B-ORG",
//     //         "score": 0.5698583126068115,
//     //         "index": 196,
//     //         "word": "Medium",
//     //         "start": 946,
//     //         "end": 952
//     //     },
//     //     {
//     //         "entity": "B-ORG",
//     //         "score": 0.8671323657035828,
//     //         "index": 308,
//     //         "word": "Medium",
//     //         "start": 1426,
//     //         "end": 1432
//     //     }
//     // ]

//     // @ts-ignore
//     highlightCompanyNames(companiesWithDetails);
//   });

//   console.info("[vitesse-webext] Hello world from content script");

//   // communication example: send previous tab title from background page
//   onMessage("tab-prev", ({ data }) => {
//     console.log(`[vitesse-webext] Navigate from page "${data.title}"`);
//   });

//   // mount component to context window
//   const container = document.createElement("div");
//   container.id = __NAME__;
//   const root = document.createElement("div");
//   const styleEl = document.createElement("link");
//   const shadowDOM =
//     container.attachShadow?.({ mode: __DEV__ ? "open" : "closed" }) ||
//     container;
//   styleEl.setAttribute("rel", "stylesheet");
//   styleEl.setAttribute(
//     "href",
//     browser.runtime.getURL("dist/contentScripts/style.css")
//   );
//   shadowDOM.appendChild(styleEl);
//   shadowDOM.appendChild(root);
//   document.body.appendChild(container);
//   const app = createApp(App);
//   setupApp(app);
//   app.mount(root);
// })();

// interface Company {
//   entity: string;
//   score: number;
//   index: number;
//   word: string;
//   start: number;
//   end: number;
// }

// const highlightCompanyNames = (companies: Company[]) => {
//   try {
//     const body = document.body;
//     let html = body.innerHTML;

//     // Highlight company names
//     companies.forEach((company) => {
//       const regex = new RegExp(`\\b${company.word}\\b`, "g");
//       html = html.replace(
//         regex,
//         `<button class="highlighted-word">${company.word}</button>`
//       );
//     });
//     body.innerHTML = html;

//     // Create tooltip element and styles
//     const createTooltip = () => {
//       const style = document.createElement("style");
//       style.innerHTML = `
//         .tooltip {
//           position: absolute;
//           background-color: #fff;
//           border: 1px solid #ccc;
//           padding: 5px;
//           border-radius: 5px;
//           box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
//           z-index: 1000;
//           display: none;
//         }

//         .highlighted-word {
//           background-color: #007bff;
//           border: none;
//           border-radius: 5px;
//           padding: 5px 10px;
//           margin: 0;
//           cursor: pointer;
//           color: white;
//           font-size: 1em;
//           transition: background-color 0.3s ease, transform 0.3s ease;
//         }
//         .highlighted-word:hover {
//           background-color: #0056b3;
//           transform: translateY(-2px);
//         }
//         .highlighted-word:focus {
//           outline: none;
//           box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5);
//         }
//       `;
//       document.head.appendChild(style);

//       const tooltip = document.createElement("div");
//       tooltip.className = "tooltip";
//       document.body.appendChild(tooltip);

//       return tooltip;
//     };

//     const tooltip = createTooltip();

//     const showTooltip = (event: MouseEvent, description = "") => {
//       tooltip.textContent = description;
//       tooltip.style.left = `${event.pageX + 10}px`;
//       tooltip.style.top = `${event.pageY + 10}px`;
//       tooltip.style.display = "block";
//     };

//     const hideTooltip = () => {
//       tooltip.style.display = "none";
//     };

//     // Add tooltip events
//     const addTooltipEvents = (companies: Company[]) => {
//       const highlightedWords = document.querySelectorAll(".highlighted-word");
//       highlightedWords.forEach((word) => {
//         const company = companies.find((c) => c.word === word.textContent);
//         if (company) {
//           word.addEventListener("mouseover", (event) =>
//             showTooltip(event as MouseEvent, company.entity)
//           );
//           word.addEventListener("mouseout", hideTooltip);
//         }
//       });
//     };

//     addTooltipEvents(companies);

//     console.log("Background color changed and tooltip added.");
//   } catch (error) {
//     console.error("Error in highlight-text", error);
//   }
// };

/* eslint-disable no-console */
import { onMessage, sendMessage } from "webext-bridge/content-script";
import { createApp } from "vue";
import App from "./views/App.vue";
import { setupApp } from "~/logic/common-setup";

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  let companiesWithDetails;
 // Define the mergeSubwords function to merge subwords of entities
const mergeSubwords = (entities) => {
    let mergedEntities = [];
    let currentEntity = null;

    for (let token of entities) {
        if (token.entity.startsWith('B-')) {  // Beginning of a new entity
            if (currentEntity) {  // Append previous entity
                mergedEntities.push(currentEntity);
            }
            currentEntity = {
                entity: token.entity.substring(2),  // Remove 'B-' prefix
                score: token.score,
                word: token.word,
                start: token.start,
                end: token.end
            };
        } else if (token.entity.startsWith('I-') && currentEntity) {  // Continuation of an entity
            currentEntity.word += token.word.replace('##', '');  // Merge subword
            currentEntity.end = token.end;
            currentEntity.score = Math.min(currentEntity.score, token.score);  // Update score with minimum value
        } else {
            if (currentEntity) {
                mergedEntities.push(currentEntity);
                currentEntity = null;
            }
        }
    }

    if (currentEntity) {  // Append the last entity
        mergedEntities.push(currentEntity);
    }

    return mergedEntities;
};

// Update the message handler to use the mergeSubwords function
onMessage("get-text-highlight", async () => {
    companiesWithDetails = await sendMessage(
      "get-named-entity",
      {
        data: document.body.innerText,
      },
      "background"
    );

    const mergedCompanies = mergeSubwords(companiesWithDetails);

    // @ts-ignore
    highlightCompanyNames(mergedCompanies);
});


  console.info("[vitesse-webext] Hello world from content script");

  onMessage("tab-prev", ({ data }) => {
    console.log(`[vitesse-webext] Navigate from page "${data.title}"`);
  });

  const container = document.createElement("div");
  container.id = __NAME__;
  const root = document.createElement("div");
  const styleEl = document.createElement("link");
  const shadowDOM =
    container.attachShadow?.({ mode: __DEV__ ? "open" : "closed" }) ||
    container;
  styleEl.setAttribute("rel", "stylesheet");
  styleEl.setAttribute(
    "href",
    browser.runtime.getURL("dist/contentScripts/style.css")
  );
  shadowDOM.appendChild(styleEl);
  shadowDOM.appendChild(root);
  document.body.appendChild(container);
  const app = createApp(App);
  setupApp(app);
  app.mount(root);
})();

interface Company {
  entity: string;
  score: number;
  index: number;
  word: string;
  start: number;
  end: number;
}

const highlightCompanyNames = (companies: Company[]) => {
  try {
    // Function to create a styled button
    const createButton = (text: string) => {
      const button = document.createElement("button");
      button.className = "highlighted-word";
      button.textContent = text;
      return button;
    };

    // Iterate over text nodes and replace company names with buttons
    const replaceTextWithButtons = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent;
        if (textContent) {
          companies.forEach((company) => {
            const regex = new RegExp(`\\b${company.word}\\b`, "g");
            const matches = textContent.match(regex);
            if (matches) {
              const fragments = textContent.split(regex);
              const parent = node.parentNode;
              fragments.forEach((fragment, index) => {
                parent?.insertBefore(document.createTextNode(fragment), node);
                if (index < matches.length) {
                  const button = createButton(company.word);
                  parent?.insertBefore(button, node);
                }
              });
              parent?.removeChild(node);
            }
          });
        }
      } else {
        node.childNodes.forEach(replaceTextWithButtons);
      }
    };

    // Start replacing from the body
    replaceTextWithButtons(document.body);

    // Create tooltip element and styles
    const createTooltip = () => {
      const style = document.createElement("style");
      style.innerHTML = `
        .tooltip {
          position: absolute;
          background-color: #fff;
          border: 1px solid #ccc;
          padding: 5px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          display: none;
        }

        .highlighted-word {
          background-color: #007bff;
          border: none;
          border-radius: 5px;
          padding: 5px 10px;
          margin: 0;
          cursor: pointer;
          color: white;
          font-size: 1em;
          transition: background-color 0.3s ease, transform 0.3s ease;
        }
        .highlighted-word:hover {
          background-color: #0056b3;
          transform: translateY(-2px);
        }
        .highlighted-word:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5);
        }
      `;
      document.head.appendChild(style);

      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      document.body.appendChild(tooltip);

      return tooltip;
    };

    const tooltip = createTooltip();

    const showTooltip = (event: MouseEvent, description = "") => {
      tooltip.textContent = description;
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY + 10}px`;
      tooltip.style.display = "block";
    };

    const hideTooltip = () => {
      tooltip.style.display = "none";
    };

    // Add tooltip events
    const addTooltipEvents = (companies: Company[]) => {
      const highlightedWords = document.querySelectorAll(".highlighted-word");
      highlightedWords.forEach((word) => {
        const company = companies.find((c) => c.word === word.textContent);
        if (company) {
          word.addEventListener("mouseover", (event) =>
            showTooltip(event as MouseEvent, company.entity)
          );
          word.addEventListener("mouseout", hideTooltip);
        }
      });
    };

    addTooltipEvents(companies);

    console.log("Background color changed and tooltip added.");
  } catch (error) {
    console.error("Error in highlight-text", error);
  }
};
