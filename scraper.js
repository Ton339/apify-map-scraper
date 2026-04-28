import "dotenv/config";
import { ApifyClient } from "apify-client";
import fs from "fs";

// Initialize the ApifyClient with API token
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// State list ตรงนี้
const stateList = ["นครศรีธรรมราช","บุรีรัมย์"];

const baseInput = {
  countryCode: "th",
  includeWebResults: false,
  language: "th",
  maxCrawledPlacesPerSearch: 2000,
  maximumLeadsEnrichmentRecords: 0,
  scrapeContacts: false,
  scrapeDirectories: false,
  scrapeImageAuthors: false,
  scrapePlaceDetailPage: false,
  scrapeReviewsPersonalData: true,
  scrapeSocialMediaProfiles: {
    facebooks: false,
    instagrams: false,
    tiktoks: false,
    twitters: false,
    youtubes: false,
  },
  scrapeTableReservationProvider: false,
  searchStringsArray: ["กวดวิชา", "ติวเตอร์", "Tutor"],
  skipClosedPlaces: false,
  verifyLeadsEnrichmentEmails: false,
};

(async () => {
  console.log("Creating tasks...");

  // Create tasks for each state
  const tasksPromises = stateList.map((state, index) =>
    client.tasks().create({
      actId: "nwua9Gu5YrADL7ZDj",
      name: `map-scraper-${Date.now()}-${index}`,
      input: {
        ...baseInput,
        locationQuery: `${state}, Thailand`,
        state: state,
      },
      options: { memoryMbytes: 4096 },
    }),
  );

  // Create all tasks in parallel
  const createdTasks = await Promise.all(tasksPromises);
  console.log(`Created ${createdTasks.length} tasks.`);

  // Run all tasks in parallel
  console.log("Running tasks in parallel...");
  const runs = await Promise.all(
    createdTasks.map((task) => client.task(task.id).call()),
  );
  console.log("All tasks completed!");

  // Create results directory if it doesn't exist
  if (!fs.existsSync("results")) {
    fs.mkdirSync("results");
  }

  // Fetch results for each state
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const state = stateList[i];
    const taskId = createdTasks[i].id;

    console.log(`Downloading dataset as CSV for: ${state} (Run ID: ${run.id})`);
    const csvData = await client
      .dataset(run.defaultDatasetId)
      .downloadItems("csv", {
        fields: [
          "title",
          "totalScore",
          "reviewsCount",
          "street",
          "city",
          "state",
          "countryCode",
          "website",
          "phone",
          "url",
          "categories/0",
          "categories/1",
          "categoryName",
        ],
      });

    // Save the CSV data to a file for each state
    const filename = `results/results_${state}.csv`;
    fs.writeFileSync(filename, csvData);
    console.log(`Results successfully saved to ${filename}`);
  }
})();
