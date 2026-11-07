import { installMockApi } from "@/mock/install";

// Runs before the app becomes interactive, so no component can fetch first.
installMockApi();
