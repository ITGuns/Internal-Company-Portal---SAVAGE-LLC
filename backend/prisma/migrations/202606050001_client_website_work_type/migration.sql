-- Track whether client website work is a new build or an improvement to an existing site.
ALTER TABLE "ClientOrganization" ADD COLUMN "websiteWorkType" TEXT;
