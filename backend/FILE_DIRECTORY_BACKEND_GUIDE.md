# File Directory Backend Integration Guide

**Last Updated:** February 25, 2026  
**Status:** Frontend Complete ✅ | Backend Pending 🔧  
**Priority:** High (Required for Production Launch)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Frontend Status](#frontend-status)
3. [Backend Requirements](#backend-requirements)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Google Drive Integration](#google-drive-integration)
7. [Implementation Guide](#implementation-guide)
8. [Testing Requirements](#testing-requirements)
9. [Deployment Checklist](#deployment-checklist)

---

## 🎯 Overview

### What is File Directory?

The File Directory feature allows employees to access and organize company Google Drive folders through a unified portal interface. Instead of navigating multiple Drive links or bookmarks, users can:

- Browse company folders organized by department
- Search for folders by name or department
- See folder metadata (item count, last updated)
- Access Drive folders with a single click
- View folders in grid or list mode
- Filter by department or search query

### Current Implementation

**Frontend:** ✅ Complete
- Full UI/UX implementation
- Grid and list view modes
- Department-based color coding
- Search and filter functionality
- Custom folder addition via modal
- Breadcrumb navigation
- **Persistence:** Currently uses `localStorage` for development

**Backend:** 🔧 Required
- API endpoints for CRUD operations
- Google Drive API integration
- Database persistence
- Role-based access control (optional)

---

## 📊 Frontend Status

### Completed Features

1. **File Directory Page** (`frontend/src/app/file-directory/page.tsx`)
   - Full page implementation with grid/list toggle
   - Department filter dropdown (6 departments)
   - Search functionality
   - Breadcrumb navigation
   - 139 mock folders for development

2. **Add Folder Modal** (`frontend/src/components/file-directory/AddFolderModal.tsx`)
   - Form to add new Google Drive folders
   - **Fields:**
     - Google Drive Link (validated)
     - Folder Name
     - Department Selector
     - Custom Color Picker (12 preset colors)
   - **Validation:** Drive link format validation
   - **Submission:** Currently saves to localStorage

3. **Folder Card Component** (`frontend/src/components/file-directory/FolderCard.tsx`)
   - Grid view card with department colors
   - Item count badge
   - Hover effects and animations
   - Click to open Drive link in new tab
   - Delete action (trash icon)

4. **Type Definitions** (`frontend/src/lib/file-directory-types.ts`)
   - TypeScript interfaces ready for backend
   - See "Database Schema" section below

5. **Data Layer** (`frontend/src/lib/file-directory.ts`)
   - Helper functions for localStorage
   - Department constants
   - Color mappings
   - **Functions ready to replace:**
     - `getCustomFolders()` → API GET request
     - `saveCustomFolder()` → API POST request
     - `deleteCustomFolder()` → API DELETE request

### Mock Data Structure

Currently, the frontend has **139 mock folders** for UI testing. These will be replaced with real database records.

**Department Distribution:**
- Operations: 35 folders
- Creatives: 30 folders
- Finance: 25 folders
- Engineering: 25 folders
- Website Developers: 10 folders
- Digital Marketing: 8 folders
- Payroll/Finance: 6 folders

---

## 🗄️ Database Schema

### Recommended Prisma Schema

Add this to `backend/prisma/schema.prisma`:

```prisma
model FileDirectory {
  id          String   @id @default(cuid())
  name        String
  type        String   @default("folder") // "folder" or "file"
  department  String   // Must match frontend Department type
  driveLink   String?  // Google Drive URL
  driveId     String?  // Extracted Drive folder ID
  parentId    String?  // Hierarchical parent (null = root)
  itemCount   Int?     // Item count from Drive API
  customColor String?  // Override department color (#hex)
  
  // Metadata
  description String?
  tags        String[] // Array of tags
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  parent      FileDirectory?  @relation("Hierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    FileDirectory[] @relation("Hierarchy")
  
  // Optional: Track who created
  createdById String?
  createdBy   User?   @relation(fields: [createdById], references: [id])
  
  @@index([department])
  @@index([parentId])
  @@index([createdById])
  @@map("file_directories")
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String (cuid) | Yes | Unique identifier |
| `name` | String | Yes | Folder display name |
| `type` | String | Yes | "folder" or "file" (currently only "folder" used) |
| `department` | String | Yes | One of: "Website Developers", "Operations Manager", "Payroll/Finance", "Digital Marketing Lead", "Analytics VA", "Automation VA" |
| `driveLink` | String | No | Full Google Drive URL |
| `driveId` | String | No | Extracted Drive ID for API calls |
| `parentId` | String | No | Parent folder ID (null = root) |
| `itemCount` | Int | No | Number of items (fetched from Drive API) |
| `customColor` | String | No | Hex color (e.g., "#3b82f6") to override department color |
| `description` | String | No | Folder description |
| `tags` | String[] | No | Search tags |
| `createdAt` | DateTime | Yes | Auto-generated timestamp |
| `updatedAt` | DateTime | Yes | Auto-updated timestamp |
| `createdById` | String | No | User who created this folder |

### Valid Department Values

**IMPORTANT:** Must match frontend `Department` type exactly:

```typescript
type Department = 
  | "Website Developers"
  | "Operations Manager"
  | "Payroll/Finance"
  | "Digital Marketing Lead"
  | "Analytics VA"
  | "Automation VA";
```

Reference: `frontend/src/lib/departments.ts`

---

## 🔌 API Endpoints

### Base URL

```
/api/file-directory
```

### Required Endpoints

#### 1. Get All Folders

**Endpoint:** `GET /api/file-directory`

**Description:** Retrieve all file directories with optional filtering

**Query Parameters:**
- `department` (optional): Filter by department
- `search` (optional): Search by name (case-insensitive)
- `parentId` (optional): Get children of specific folder

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "cln1234567890",
      "name": "2024 Tax Documents",
      "type": "folder",
      "department": "Payroll/Finance",
      "driveLink": "https://drive.google.com/drive/folders/abc123",
      "driveId": "abc123",
      "parentId": null,
      "itemCount": 24,
      "customColor": null,
      "description": null,
      "tags": [],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-02-25T14:22:00.000Z",
      "createdBy": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@savage.com"
      }
    }
  ],
  "count": 139
}
```

**Error Response:** `500 Internal Server Error`
```json
{
  "success": false,
  "error": "Failed to fetch file directories"
}
```

---

#### 2. Create New Folder

**Endpoint:** `POST /api/file-directory`

**Description:** Add a new Google Drive folder to the directory

**Request Body:**
```json
{
  "name": "Q1 2026 Reports",
  "department": "Operations Manager",
  "driveLink": "https://drive.google.com/drive/folders/xyz789",
  "customColor": "#f59e0b",
  "description": "First quarter reports and analytics",
  "tags": ["reports", "2026", "Q1"]
}
```

**Validation Rules:**
- `name`: Required, 1-255 characters
- `department`: Required, must be valid Department type
- `driveLink`: Optional but recommended, must be valid Google Drive URL
- `customColor`: Optional, must be valid hex color (#RRGGBB or #RGB)
- `parentId`: Automatically set to `null` (all folders at root level for now)

**Drive Link Validation Pattern:**
```regex
^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)[a-zA-Z0-9_-]+
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "cln9876543210",
    "name": "Q1 2026 Reports",
    "type": "folder",
    "department": "Operations Manager",
    "driveLink": "https://drive.google.com/drive/folders/xyz789",
    "driveId": "xyz789",
    "parentId": null,
    "itemCount": null,
    "customColor": "#f59e0b",
    "description": "First quarter reports and analytics",
    "tags": ["reports", "2026", "Q1"],
    "createdAt": "2026-02-25T15:30:00.000Z",
    "updatedAt": "2026-02-25T15:30:00.000Z",
    "createdBy": {
      "id": "user456",
      "name": "Current User",
      "email": "user@savage.com"
    }
  }
}
```

**Error Responses:**

`400 Bad Request` (Validation Error):
```json
{
  "success": false,
  "error": "Invalid request",
  "details": [
    "name is required",
    "driveLink must be a valid Google Drive URL"
  ]
}
```

`409 Conflict` (Duplicate Drive Link):
```json
{
  "success": false,
  "error": "A folder with this Drive link already exists"
}
```

---

#### 3. Update Folder

**Endpoint:** `PATCH /api/file-directory/:id`

**Description:** Update folder metadata (name, department, color, etc.)

**Request Body:**
```json
{
  "name": "Updated Folder Name",
  "department": "Website Developers",
  "customColor": "#8b5cf6",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cln9876543210",
    "name": "Updated Folder Name",
    "department": "Website Developers",
    "customColor": "#8b5cf6",
    "description": "Updated description",
    "updatedAt": "2026-02-25T16:00:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "File directory not found"
}
```

---

#### 4. Delete Folder

**Endpoint:** `DELETE /api/file-directory/:id`

**Description:** Remove a folder from the directory (does NOT delete from Google Drive)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "File directory deleted successfully"
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "File directory not found"
}
```

**Note:** Deleting a folder with children should:
- **Option A (Recommended):** Set children's `parentId` to `null` (move to root)
- **Option B:** Prevent deletion if folder has children
- **Option C:** Cascade delete (dangerous - not recommended)

---

#### 5. Sync Folder Metadata (Optional)

**Endpoint:** `POST /api/file-directory/:id/sync`

**Description:** Fetch latest metadata from Google Drive API

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "cln9876543210",
    "itemCount": 27,
    "updatedAt": "2026-02-25T16:15:00.000Z"
  }
}
```

**Use Case:** Refresh item count, last modified date without manual update

---

## 🔗 Google Drive Integration

### Overview

The File Directory feature links to Google Drive but does **not** embed or display Drive contents. It serves as a directory/bookmark system.

### Required Google Drive API Features

1. **Extract Folder ID from URL**
   - Input: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0`
   - Output: `1a2b3c4d5e6f7g8h9i0`
   - Use regex: `/\/folders\/([a-zA-Z0-9_-]+)/`

2. **Fetch Folder Metadata** (Optional but Recommended)
   ```
   GET https://www.googleapis.com/drive/v3/files/{folderId}
   ?fields=name,mimeType,modifiedTime,size
   ```
   
   **Use Cases:**
   - Auto-populate folder name when adding new folder
   - Get item count (requires listing children)
   - Verify folder exists and is accessible
   - Display last modified date

3. **Validate Drive Link** (Required)
   - Check if Drive ID is valid
   - Verify user has access to folder
   - Return error if folder is private or deleted

### Google Drive API Setup

**Service Account Configuration:**

1. **Create Service Account** in Google Cloud Console
2. **Enable Drive API** for project
3. **Generate API Key** or use OAuth 2.0
4. **Share Folders** with service account email (for private folders)

**Environment Variables:**
```env
GOOGLE_DRIVE_API_KEY=your_api_key_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

**Recommended Library:** `googleapis` npm package

```bash
npm install googleapis
```

**Example Integration:**

```typescript
import { google } from 'googleapis';

const drive = google.drive({
  version: 'v3',
  auth: process.env.GOOGLE_DRIVE_API_KEY
});

async function getDriveFolderMetadata(folderId: string) {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'name, mimeType, modifiedTime, size'
    });
    
    return {
      name: response.data.name,
      itemCount: await getItemCount(folderId),
      lastModified: response.data.modifiedTime
    };
  } catch (error) {
    throw new Error('Failed to fetch Drive folder metadata');
  }
}

async function getItemCount(folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id)'
  });
  
  return response.data.files?.length || 0;
}
```

### Error Handling

**Common Drive API Errors:**

| Error Code | Reason | Frontend Action |
|------------|--------|-----------------|
| 404 | Folder not found or deleted | Show error toast, prevent save |
| 403 | No access permission | Show "Folder is private" error |
| 401 | Invalid API key | Backend configuration issue |
| 429 | Rate limit exceeded | Retry with exponential backoff |

---

## 🛠️ Implementation Guide

### Step-by-Step Backend Implementation

#### Phase 1: Database Setup (30 minutes)

1. **Add Prisma Schema**
   ```bash
   # Add FileDirectory model to prisma/schema.prisma
   # See "Database Schema" section above
   ```

2. **Run Migration**
   ```bash
   npx prisma migrate dev --name add_file_directory
   ```

3. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Verify Schema**
   ```bash
   npx prisma studio
   # Check FileDirectory model in GUI
   ```

---

#### Phase 2: Service Layer (1-2 hours)

Create `backend/src/file-directory/file-directory.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { FileDirectory, Prisma } from '@prisma/client';

@Injectable()
export class FileDirectoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    department?: string;
    search?: string;
    parentId?: string;
  }): Promise<FileDirectory[]> {
    const where: Prisma.FileDirectoryWhereInput = {};

    if (params?.department) {
      where.department = params.department;
    }

    if (params?.search) {
      where.name = {
        contains: params.search,
        mode: 'insensitive'
      };
    }

    if (params?.parentId !== undefined) {
      where.parentId = params.parentId;
    }

    return this.prisma.fileDirectory.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async create(data: {
    name: string;
    department: string;
    driveLink?: string;
    customColor?: string;
    description?: string;
    tags?: string[];
    createdById?: string;
  }): Promise<FileDirectory> {
    // Extract Drive ID from link
    const driveId = data.driveLink 
      ? this.extractDriveId(data.driveLink)
      : null;

    return this.prisma.fileDirectory.create({
      data: {
        name: data.name,
        type: 'folder',
        department: data.department,
        driveLink: data.driveLink || null,
        driveId,
        parentId: null, // All folders at root for now
        customColor: data.customColor || null,
        description: data.description || null,
        tags: data.tags || [],
        createdById: data.createdById || null
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async update(
    id: string, 
    data: Prisma.FileDirectoryUpdateInput
  ): Promise<FileDirectory> {
    return this.prisma.fileDirectory.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    // Move children to root (Option A)
    await this.prisma.fileDirectory.updateMany({
      where: { parentId: id },
      data: { parentId: null }
    });

    // Delete folder
    await this.prisma.fileDirectory.delete({
      where: { id }
    });
  }

  private extractDriveId(driveLink: string): string | null {
    const match = driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
}
```

---

#### Phase 3: Controller Layer (1 hour)

Create `backend/src/file-directory/file-directory.controller.ts`:

```typescript
import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { FileDirectoryService } from './file-directory.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('api/file-directory')
@UseGuards(JwtAuthGuard)
export class FileDirectoryController {
  constructor(
    private readonly fileDirectoryService: FileDirectoryService
  ) {}

  @Get()
  async findAll(
    @Query('department') department?: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string
  ) {
    try {
      const data = await this.fileDirectoryService.findAll({
        department,
        search,
        parentId
      });

      return {
        success: true,
        data,
        count: data.length
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch file directories'
      };
    }
  }

  @Post()
  async create(@Body() body: any, @Req() req: Request) {
    try {
      // Validation
      if (!body.name || !body.department) {
        return {
          success: false,
          error: 'Name and department are required'
        };
      }

      // Validate Drive link format
      if (body.driveLink && !this.isValidDriveLink(body.driveLink)) {
        return {
          success: false,
          error: 'Invalid Google Drive URL format'
        };
      }

      // Create folder
      const data = await this.fileDirectoryService.create({
        name: body.name,
        department: body.department,
        driveLink: body.driveLink,
        customColor: body.customColor,
        description: body.description,
        tags: body.tags,
        createdById: req.user?.id // From JWT
      });

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create file directory'
      };
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const data = await this.fileDirectoryService.update(id, body);

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update file directory'
      };
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      await this.fileDirectoryService.delete(id);

      return {
        success: true,
        message: 'File directory deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete file directory'
      };
    }
  }

  private isValidDriveLink(url: string): boolean {
    const pattern = /^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)[a-zA-Z0-9_-]+/;
    return pattern.test(url);
  }
}
```

---

#### Phase 4: Module Registration (15 minutes)

Create `backend/src/file-directory/file-directory.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { FileDirectoryController } from './file-directory.controller';
import { FileDirectoryService } from './file-directory.service';
import { PrismaService } from '@/database/prisma.service';

@Module({
  controllers: [FileDirectoryController],
  providers: [FileDirectoryService, PrismaService],
  exports: [FileDirectoryService]
})
export class FileDirectoryModule {}
```

Add to `backend/src/app.module.ts`:

```typescript
import { FileDirectoryModule } from './file-directory/file-directory.module';

@Module({
  imports: [
    // ... other modules
    FileDirectoryModule,
  ],
})
export class AppModule {}
```

---

#### Phase 5: Frontend Integration (30 minutes)

Update `frontend/src/lib/file-directory.ts`:

**Before (localStorage):**
```typescript
export const getCustomFolders = (): FileDirectory[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('customFolders');
  return stored ? JSON.parse(stored) : [];
};
```

**After (API):**
```typescript
import { apiFetch } from './apiFetch';

export const getCustomFolders = async (): Promise<FileDirectory[]> => {
  try {
    const response = await apiFetch('/api/file-directory');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch folders:', error);
    return [];
  }
};

export const saveCustomFolder = async (
  folder: Omit<FileDirectory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FileDirectory> => {
  const response = await apiFetch('/api/file-directory', {
    method: 'POST',
    body: JSON.stringify(folder)
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to create folder');
  }
  
  return response.data;
};

export const deleteCustomFolder = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/file-directory/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete folder');
  }
};
```

**Update File Directory Page:**

Change from synchronous to async:

```typescript
// Before
const [folders, setFolders] = useState<FileDirectory[]>([
  ...mockDirectoryData,
  ...getCustomFolders()
]);

// After
const [folders, setFolders] = useState<FileDirectory[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadFolders() {
    setLoading(true);
    try {
      const data = await getCustomFolders();
      setFolders(data);
    } catch (error) {
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }
  
  loadFolders();
}, []);
```

---

## 🧪 Testing Requirements

### Backend Tests

**Unit Tests** (`file-directory.service.spec.ts`):
```typescript
describe('FileDirectoryService', () => {
  it('should create a folder with valid data', async () => {
    const folder = await service.create({
      name: 'Test Folder',
      department: 'Website Developers',
      driveLink: 'https://drive.google.com/drive/folders/abc123'
    });
    
    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('Test Folder');
    expect(folder.driveId).toBe('abc123');
  });

  it('should extract Drive ID from URL', () => {
    const url = 'https://drive.google.com/drive/folders/1a2b3c4d5';
    const id = service['extractDriveId'](url);
    expect(id).toBe('1a2b3c4d5');
  });

  it('should filter folders by department', async () => {
    const folders = await service.findAll({ 
      department: 'Operations Manager' 
    });
    
    folders.forEach(folder => {
      expect(folder.department).toBe('Operations Manager');
    });
  });
});
```

**Integration Tests** (`file-directory.controller.spec.ts`):
```typescript
describe('FileDirectoryController', () => {
  it('GET /api/file-directory should return all folders', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/file-directory')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('POST /api/file-directory should create folder', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/file-directory')
      .send({
        name: 'New Folder',
        department: 'Website Developers',
        driveLink: 'https://drive.google.com/drive/folders/xyz'
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('New Folder');
  });

  it('DELETE /api/file-directory/:id should delete folder', async () => {
    const folder = await createTestFolder();
    
    const response = await request(app.getHttpServer())
      .delete(`/api/file-directory/${folder.id}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

### Frontend Tests

**Component Tests:**
```typescript
describe('AddFolderModal', () => {
  it('should validate Drive link format', async () => {
    render(<AddFolderModal isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const input = screen.getByLabelText('Google Drive Link');
    fireEvent.change(input, { target: { value: 'invalid-url' } });
    
    const submitButton = screen.getByText('Add Folder');
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/Invalid Google Drive link/i)).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

- [ ] Create folder with valid Drive link
- [ ] Create folder without Drive link
- [ ] Filter by each department (6 departments)
- [ ] Search for folder by name
- [ ] Delete folder
- [ ] Verify folder opens correct Drive link in new tab
- [ ] Test with custom colors
- [ ] Test pagination (if >100 folders)
- [ ] Test error handling (network failure, invalid data)

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit + integration)
- [ ] Database migration applied in staging
- [ ] Google Drive API credentials configured
- [ ] Environment variables set in production
- [ ] API endpoints tested in Postman/Insomnia
- [ ] Frontend connected to staging backend
- [ ] Error logging configured (Sentry, etc.)

### Deployment Steps

1. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Verify Migration**
   ```bash
   npx prisma db pull
   ```

3. **Seed Initial Data** (Optional)
   ```bash
   npx prisma db seed
   ```

4. **Deploy Backend**
   ```bash
   npm run build
   npm run start:prod
   ```

5. **Update Frontend Environment**
   ```env
   NEXT_PUBLIC_API_URL=https://api.savage-portal.com
   ```

6. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to Vercel, Netlify, or your platform
   ```

7. **Smoke Test Production**
   - Load file directory page
   - Add new folder
   - Delete folder
   - Search/filter folders
   - Verify Drive links work

### Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Check database for duplicate entries
- [ ] Verify Drive API quota usage
- [ ] Gather user feedback
- [ ] Plan v2 features (hierarchical folders, permissions)

---

## 📈 Future Enhancements (v2)

### Phase 2 Features (Post-Launch)

1. **Hierarchical Folders**
   - Nested folder structure
   - Breadcrumb navigation
   - Parent-child relationships
   - Drag-and-drop to move folders

2. **Role-Based Access Control**
   - Department-specific permissions
   - Admin: full access
   - Manager: department access
   - Employee: read-only access

3. **Advanced Search**
   - Search by tags
   - Search by date range
   - Full-text description search

4. **File Support**
   - Link individual Drive files (not just folders)
   - File type icons (PDF, Excel, Word)
   - File size display

5. **Bulk Operations**
   - Bulk delete
   - Bulk department change
   - Export folder list to CSV

6. **Analytics**
   - Most accessed folders
   - Folder creation trends
   - Department usage stats

7. **Real-Time Updates**
   - WebSocket for live folder additions
   - Toast notifications when new folder added

---

## ❓ FAQ

### Q: Should we sync all Drive folder contents?

**A:** No. The File Directory feature is a **bookmark/directory system**, not a Drive replacement. It links to Drive but doesn't sync contents. Users click a folder to open Drive in a new tab.

### Q: How do we handle deleted Drive folders?

**A:** Options:
1. Detect 404 errors when validating Drive links
2. Run periodic cleanup job to check Drive API
3. Add "Report Broken Link" button for users
4. Mark as archived instead of deleting from database

### Q: Can users upload files through the portal?

**A:** Not in v1. The portal only **links** to existing Drive folders. Uploads happen in Drive directly.

### Q: What if a Drive folder is private?

**A:** Two approaches:
1. **Service Account Access:** Share all company folders with service account email
2. **User OAuth:** Use user's Drive access (requires OAuth flow)

Recommendation: Service account for simplicity

### Q: How many Drive API calls will this make?

**A:** Minimal:
- Creating folder: 1 API call (validate Drive ID)
- Loading folders: 0 API calls (from database)
- Syncing metadata: 1 API call per folder (optional, on-demand)

With 139 folders and 50 users, expect <100 API calls/day.

Drive API quota: **1,000,000,000 queries/day** (free tier)

---

## 📞 Support & Questions

**Frontend Reference:** `frontend/src/app/file-directory/*`  
**Type Definitions:** `frontend/src/lib/file-directory-types.ts`  
**Mock Data:** `frontend/src/lib/file-directory.ts` (139 folders)

**Questions?** Contact frontend developer or refer to:
- Google Drive API Docs: https://developers.google.com/drive/api/v3/about-sdk
- Prisma Docs: https://www.prisma.io/docs
- NestJS Docs: https://docs.nestjs.com

---

**Document Version:** 1.0  
**Created By:** Development Team  
**Last Updated:** February 25, 2026  
**Status:** Ready for Backend Implementation ✅

---

## Quick Start Summary

```bash
# 1. Add Prisma schema
# Copy FileDirectory model from "Database Schema" section

# 2. Run migration
npx prisma migrate dev --name add_file_directory

# 3. Create files
mkdir -p backend/src/file-directory
touch backend/src/file-directory/file-directory.service.ts
touch backend/src/file-directory/file-directory.controller.ts
touch backend/src/file-directory/file-directory.module.ts

# 4. Copy code from "Implementation Guide" section

# 5. Register module in app.module.ts

# 6. Test endpoints
curl http://localhost:3001/api/file-directory

# 7. Update frontend to use API instead of localStorage
# See "Phase 5: Frontend Integration"

# Done! 🎉
```
