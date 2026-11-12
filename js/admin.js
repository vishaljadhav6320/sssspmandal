/**
 * SSSSP Mandal - Admin Dashboard Operations
 * Complete CRUD for Media, Announcements, Documents & Enquiries
 */

(function () {
  let currentUser = null;
  let activeTab = "overview";

  // Cached datasets for client-side filtering
  let mediaList = [];
  let announcementsList = [];
  let documentsList = [];
  let enquiriesList = [];

  // Expose API upfront to prevent any timing issues
  window.SSSPM_ADMIN = {
    init: initAdmin,
    switchTab: switchTab,
    openMediaModal: openMediaModal,
    openEditMedia: openMediaModal,
    openEditMediaById: openEditMediaById,
    closeMediaModal: closeMediaModal,
    toggleMediaPublish: toggleMediaPublish,
    deleteMedia: deleteMedia,
    openAnnouncementModal: openAnnouncementModal,
    openEditAnnouncement: openAnnouncementModal,
    openEditAnnouncementById: openEditAnnouncementById,
    closeAnnouncementModal: closeAnnouncementModal,
    deleteAnnouncement: deleteAnnouncement,
    openDocumentModal: openDocumentModal,
    openEditDocument: openDocumentModal,
    openEditDocumentById: openEditDocumentById,
    closeDocumentModal: closeDocumentModal,
    deleteDocument: deleteDocument,
    updateEnquiryStatus: updateEnquiryStatus,
    viewEnquiryModal: viewEnquiryModal,
    viewEnquiryModalById: viewEnquiryModalById,
    closeEnquiryModal: closeEnquiryModal,
    refreshAllData: refreshAllData
  };

  // ===========================================================================
  // INITIALIZATION & AUTH CHECK
  // ===========================================================================
  async function initAdmin() {
    updateBackendStatusPill();
    setupAuthListeners();
    setupTabs();
    setupSidebarToggle();

    // Check if Supabase configured
    if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.isConfigured()) {
      showLoginAlert(
        "Notice: Supabase project credentials are not configured yet. Please open 'js/supabase-config.js' and insert your Supabase project URL and anon public key.",
        "warning"
      );
      return;
    }

    // Verify current session
    try {
      const user = await window.SSSPM_AUTH.getCurrentUser();
      if (user) {
        const isAdmin = await window.SSSPM_AUTH.checkIsAdmin(user.id);
        if (isAdmin) {
          onAdminAuthenticated(user);
          return;
        }
      }
    } catch (e) {
      console.warn("Auth check failed:", e);
    }

    // Default: show login form
    showLoginView();
  }

  function updateBackendStatusPill() {
    const pill = document.getElementById("configStatusPill");
    if (!pill) return;

    if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.isConfigured()) {
      pill.innerHTML = `<i class="fas fa-check-circle" style="color: #16a34a;"></i> Supabase Configured`;
      pill.style.background = "#dcfce7";
      pill.style.color = "#15803d";
    } else {
      pill.innerHTML = `<i class="fas fa-exclamation-circle" style="color: #d97706;"></i> Setup Pending (js/supabase-config.js)`;
      pill.style.background = "#fef3c7";
      pill.style.color = "#b45309";
    }
  }

  function setupAuthListeners() {
    const loginForm = document.getElementById("adminLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", handleLoginSubmit);
    }

    const togglePasswordBtn = document.getElementById("togglePasswordBtn");
    const passwordInput = document.getElementById("loginPassword");
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener("click", () => {
        const isPassword = passwordInput.getAttribute("type") === "password";
        passwordInput.setAttribute("type", isPassword ? "text" : "password");
        togglePasswordBtn.innerHTML = isPassword ? `<i class="fas fa-eye-slash"></i>` : `<i class="fas fa-eye"></i>`;
      });
    }

    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    const refreshBtn = document.getElementById("refreshDataBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        refreshAllData(true);
      });
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = document.getElementById("loginSubmitBtn");
    const originalText = submitBtn.innerHTML;

    hideLoginAlert();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Authenticating...`;

    try {
      const user = await window.SSSPM_AUTH.login(email, password);
      onAdminAuthenticated(user);
    } catch (err) {
      console.error("Login failed:", err);
      showLoginAlert(err.message || "Failed to sign in. Please verify your credentials and administrator permissions.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  async function handleLogout() {
    if (confirm("Are you sure you want to sign out of the Admin Portal?")) {
      await window.SSSPM_AUTH.logout();
      currentUser = null;
      showLoginView();
    }
  }

  function onAdminAuthenticated(user) {
    currentUser = user;
    const emailEl = document.getElementById("currentAdminEmail");
    if (emailEl) emailEl.textContent = user.email || "Administrator";

    const uidEl = document.getElementById("systemCurrentUid");
    if (uidEl) uidEl.textContent = user.id;

    const urlEl = document.getElementById("systemProjectUrl");
    if (urlEl) urlEl.textContent = window.SUPABASE_CONFIG.url;

    const statusEl = document.getElementById("systemConnectionStatus");
    if (statusEl) {
      statusEl.innerHTML = `<span class="badge-status badge-published"><i class="fas fa-check"></i> Connected & Verified</span>`;
    }

    document.getElementById("adminLoginSection").style.display = "none";
    document.getElementById("adminDashboardSection").style.display = "flex";

    refreshAllData(false);
  }

  function showLoginView() {
    document.getElementById("adminDashboardSection").style.display = "none";
    document.getElementById("adminLoginSection").style.display = "flex";
  }

  function showLoginAlert(msg, type = "error") {
    const alert = document.getElementById("loginAlert");
    if (!alert) return;
    alert.className = `alert-box alert-${type}`;
    alert.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${escapeHtml(msg)}`;
    alert.style.display = "block";
  }

  function hideLoginAlert() {
    const alert = document.getElementById("loginAlert");
    if (alert) alert.style.display = "none";
  }

  function showGlobalBanner(msg, type = "success") {
    const alert = document.getElementById("adminGlobalAlert");
    if (!alert) return;
    alert.style.display = "flex";
    alert.className = `admin-alert alert-${type}`;
    alert.innerHTML = `
      <div><i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(msg)}</div>
      <button onclick="document.getElementById('adminGlobalAlert').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:16px;">&times;</button>
    `;

    setTimeout(() => {
      if (alert) alert.style.display = "none";
    }, 6000);
  }

  // ===========================================================================
  // SIDEBAR & TABS
  // ===========================================================================
  function setupSidebarToggle() {
    const toggleBtn = document.getElementById("sidebarToggleBtn");
    const sidebar = document.getElementById("adminSidebar");
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".nav-tab[data-tab]");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab");
        switchTab(tabName);

        // Close sidebar on mobile
        const sidebar = document.getElementById("adminSidebar");
        if (sidebar && window.innerWidth <= 900) {
          sidebar.classList.remove("open");
        }
      });
    });
  }

  function switchTab(tabName) {
    activeTab = tabName;

    // Update nav buttons
    document.querySelectorAll(".nav-tab").forEach(t => {
      if (t.getAttribute("data-tab") === tabName) {
        t.classList.add("active");
      } else {
        t.classList.remove("active");
      }
    });

    // Update tab contents
    document.querySelectorAll(".admin-tab-content").forEach(c => {
      c.classList.remove("active");
    });
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.add("active");

    // Update section title
    const titleEl = document.getElementById("currentSectionTitle");
    if (titleEl) {
      switch (tabName) {
        case "overview": titleEl.textContent = "Dashboard Overview"; break;
        case "media": titleEl.textContent = "Media Gallery Management"; break;
        case "announcements": titleEl.textContent = "Announcements & Notices"; break;
        case "documents": titleEl.textContent = "Official Documents & Deeds"; break;
        case "enquiries": titleEl.textContent = "Contact & Admission Enquiries"; break;
        case "settings": titleEl.textContent = "System Status & Configuration"; break;
      }
    }
  }

  // ===========================================================================
  // DATA REFRESH & STATS
  // ===========================================================================
  async function refreshAllData(showNotification = false) {
    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    try {
      // 1. Fetch Media
      const { data: mediaData, error: mErr } = await client
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mErr && mediaData) {
        mediaList = mediaData;
        renderAdminMedia();
      }

      // 2. Fetch Announcements
      const { data: annData, error: aErr } = await client
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (!aErr && annData) {
        announcementsList = annData;
        renderAdminAnnouncements();
      }

      // 3. Fetch Documents
      const { data: docData, error: dErr } = await client
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (!dErr && docData) {
        documentsList = docData;
        renderAdminDocuments();
      }

      // 4. Fetch Enquiries
      const { data: enqData, error: eErr } = await client
        .from("contact_enquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (!eErr && enqData) {
        enquiriesList = enqData;
        renderAdminEnquiries();
      }

      // Update Dashboard Statistics
      updateStatCounts();

      if (showNotification) {
        showGlobalBanner("Dashboard data successfully refreshed from Supabase.");
      }
    } catch (e) {
      console.error("Data refresh error:", e);
    }
  }

  function updateStatCounts() {
    const photosCount = mediaList.filter(m => m.media_type === "photo").length;
    const videosCount = mediaList.filter(m => m.media_type === "video").length;
    const activeAnnouncementsCount = announcementsList.filter(a => a.is_published).length;
    const documentsCount = documentsList.length;
    const enquiriesCount = enquiriesList.length;
    const newEnquiriesCount = enquiriesList.filter(e => e.status === "new").length;

    const elP = document.getElementById("statPhotos");
    const elV = document.getElementById("statVideos");
    const elA = document.getElementById("statAnnouncements");
    const elD = document.getElementById("statDocuments");
    const elE = document.getElementById("statEnquiries");
    const badge = document.getElementById("sidebarEnquiriesBadge");

    if (elP) elP.textContent = photosCount;
    if (elV) elV.textContent = videosCount;
    if (elA) elA.textContent = activeAnnouncementsCount;
    if (elD) elD.textContent = documentsCount;
    if (elE) elE.textContent = enquiriesCount;

    if (badge) {
      if (newEnquiriesCount > 0) {
        badge.textContent = newEnquiriesCount;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }

    renderRecentEnquiriesList();
  }

  function renderRecentEnquiriesList() {
    const container = document.getElementById("recentEnquiriesList");
    if (!container) return;

    if (enquiriesList.length === 0) {
      container.innerHTML = `<p class="text-muted">No enquiries submitted yet.</p>`;
      return;
    }

    const recent = enquiriesList.slice(0, 5);
    let html = `<ul class="recent-enquiries-ul" style="list-style: none;">`;
    recent.forEach(item => {
      html += `
        <li style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span style="font-size: 12px; color: #64748b; display: block;">${escapeHtml(item.subject)}</span>
          </div>
          <span class="badge-status badge-${item.status}">${item.status}</span>
        </li>
      `;
    });
    html += `</ul>`;
    container.innerHTML = html;
  }

  // ===========================================================================
  // MEDIA MANAGEMENT CRUD
  // ===========================================================================
  function setupMediaManagement() {
    const addBtn = document.getElementById("btnOpenAddMedia");
    if (addBtn) addBtn.onclick = () => openMediaModal();

    const form = document.getElementById("mediaForm");
    if (form) form.onsubmit = handleMediaFormSubmit;

    const searchInput = document.getElementById("mediaSearchInput");
    const filterType = document.getElementById("mediaFilterType");
    const filterCat = document.getElementById("mediaFilterCategory");

    if (searchInput) searchInput.oninput = renderAdminMedia;
    if (filterType) filterType.onchange = renderAdminMedia;
    if (filterCat) filterCat.onchange = renderAdminMedia;

    const fileInput = document.getElementById("mediaFileInput");
    if (fileInput) fileInput.onchange = handleMediaFilePreview;
  }

  function handleMediaFilePreview(e) {
    const file = e.target.files[0];
    const previewContainer = document.getElementById("mediaPreviewContainer");
    if (!file || !previewContainer) return;

    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();

    reader.onload = function (event) {
      previewContainer.style.display = "flex";
      if (isVideo) {
        previewContainer.innerHTML = `<video controls src="${event.target.result}" style="max-height: 160px; max-width: 100%;"></video>`;
        document.getElementById("mediaTypeSelect").value = "video";
      } else {
        previewContainer.innerHTML = `<img src="${event.target.result}" alt="Preview" style="max-height: 160px; max-width: 100%;">`;
        document.getElementById("mediaTypeSelect").value = "photo";
      }
    };

    reader.readAsDataURL(file);
  }

  function openEditMediaById(id) {
    const item = mediaList.find(m => m.id === id);
    if (item) openMediaModal(item);
  }

  function openMediaModal(item = null) {
    const modal = document.getElementById("mediaModal");
    const form = document.getElementById("mediaForm");
    const titleEl = document.getElementById("mediaModalTitle");
    const previewContainer = document.getElementById("mediaPreviewContainer");
    const fileInput = document.getElementById("mediaFileInput");

    if (!modal || !form) return;

    form.reset();
    previewContainer.innerHTML = "";
    previewContainer.style.display = "none";

    if (item) {
      // Editing existing media
      titleEl.textContent = "Edit Media Details";
      document.getElementById("mediaEditId").value = item.id;
      document.getElementById("mediaExistingStoragePath").value = item.storage_path;
      document.getElementById("mediaTypeSelect").value = item.media_type;
      document.getElementById("mediaTitleInput").value = item.title;
      document.getElementById("mediaCategorySelect").value = item.category;
      document.getElementById("mediaEventDateInput").value = item.event_date || "";
      document.getElementById("mediaDescInput").value = item.description || "";
      document.getElementById("mediaPublishedCheck").checked = item.is_published;

      // File upload optional on edit
      if (fileInput) fileInput.required = false;
      if (item.storage_path) {
        const publicUrl = window.SSSPM_BACKEND.getPublicUrl(item.storage_bucket || "school-media", item.storage_path);
        previewContainer.style.display = "flex";
        if (item.media_type === "video") {
          previewContainer.innerHTML = `<video controls src="${publicUrl}" style="max-height: 160px;"></video>`;
        } else {
          previewContainer.innerHTML = `<img src="${publicUrl}" alt="Current" style="max-height: 160px;">`;
        }
      }
    } else {
      // New upload
      titleEl.textContent = "Upload New Media";
      document.getElementById("mediaEditId").value = "";
      document.getElementById("mediaExistingStoragePath").value = "";
      document.getElementById("mediaPublishedCheck").checked = true;
      if (fileInput) fileInput.required = true;
    }

    modal.style.display = "flex";
  }

  function closeMediaModal() {
    const modal = document.getElementById("mediaModal");
    if (modal) modal.style.display = "none";
  }

  async function handleMediaFormSubmit(e) {
    e.preventDefault();
    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) {
      alert("Supabase client not initialized.");
      return;
    }

    const editId = document.getElementById("mediaEditId").value;
    const mediaType = document.getElementById("mediaTypeSelect").value;
    const title = document.getElementById("mediaTitleInput").value.trim();
    const category = document.getElementById("mediaCategorySelect").value;
    const eventDate = document.getElementById("mediaEventDateInput").value || null;
    const description = document.getElementById("mediaDescInput").value.trim();
    const isPublished = document.getElementById("mediaPublishedCheck").checked;
    const fileInput = document.getElementById("mediaFileInput");
    const file = fileInput.files[0];
    const existingPath = document.getElementById("mediaExistingStoragePath").value;

    const submitBtn = document.getElementById("mediaSubmitBtn");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading & Saving...`;

    try {
      let storagePath = existingPath;

      // If a new file is uploaded
      if (file) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const folder = mediaType === "video" ? `videos/${category}` : `photos/${category}`;
        const uniqueFileName = `${folder}/${Date.now()}_${cleanName}`;

        await window.SSSPM_BACKEND.uploadStorageFile("school-media", uniqueFileName, file);
        storagePath = uniqueFileName;
      }

      if (editId) {
        // Update record
        const { error } = await client
          .from("media")
          .update({
            title: title,
            description: description,
            category: category,
            media_type: mediaType,
            event_date: eventDate,
            is_published: isPublished,
            storage_path: storagePath
          })
          .eq("id", editId);

        if (error) throw error;
        showGlobalBanner("Media record updated successfully.");
      } else {
        // Insert record
        const { error } = await client
          .from("media")
          .insert([
            {
              title: title,
              description: description,
              category: category,
              media_type: mediaType,
              storage_bucket: "school-media",
              storage_path: storagePath,
              event_date: eventDate,
              is_published: isPublished,
              created_by: currentUser ? currentUser.id : null
            }
          ]);

        if (error) throw error;
        showGlobalBanner("Media successfully uploaded and added to the gallery.");
      }

      closeMediaModal();
      await refreshAllData(false);
    } catch (err) {
      console.error("Media save error:", err);
      alert(`Error saving media: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  async function toggleMediaPublish(id, currentStatus) {
    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    try {
      const { error } = await client
        .from("media")
        .update({ is_published: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      showGlobalBanner(`Media visibility updated to: ${!currentStatus ? 'Published' : 'Hidden'}`);
      await refreshAllData(false);
    } catch (e) {
      alert("Failed to update status: " + e.message);
    }
  }

  async function deleteMedia(id, storagePath) {
    if (!confirm("Are you sure you want to permanently delete this media file and record? This action cannot be undone.")) {
      return;
    }

    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    try {
      // 1. Delete database record
      const { error: dbErr } = await client
        .from("media")
        .delete()
        .eq("id", id);

      if (dbErr) throw dbErr;

      // 2. Delete storage file if path is inside Supabase
      if (storagePath && !storagePath.startsWith("http") && !storagePath.startsWith("img/")) {
        try {
          await window.SSSPM_BACKEND.deleteStorageFile("school-media", storagePath);
        } catch (stErr) {
          console.warn("Storage deletion notice:", stErr.message);
        }
      }

      showGlobalBanner("Media item deleted successfully.");
      await refreshAllData(false);
    } catch (e) {
      alert("Failed to delete media: " + e.message);
    }
  }

  function renderAdminMedia() {
    const container = document.getElementById("adminMediaContainer");
    if (!container) return;

    const query = (document.getElementById("mediaSearchInput")?.value || "").toLowerCase().trim();
    const typeFilter = document.getElementById("mediaFilterType")?.value || "all";
    const catFilter = document.getElementById("mediaFilterCategory")?.value || "all";

    const filtered = mediaList.filter(item => {
      if (typeFilter !== "all" && item.media_type !== typeFilter) return false;
      if (catFilter !== "all" && item.category !== catFilter) return false;
      if (query) {
        const tMatch = item.title && item.title.toLowerCase().includes(query);
        const dMatch = item.description && item.description.toLowerCase().includes(query);
        if (!tMatch && !dMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: 8px;">
          <i class="fas fa-photo-video" style="font-size: 36px; color: #cbd5e1; margin-bottom: 12px;"></i>
          <h4>No media records match your filter.</h4>
        </div>
      `;
      return;
    }

    let html = "";
    filtered.forEach(item => {
      const isVideo = item.media_type === "video";
      const publicUrl = window.SSSPM_BACKEND.getPublicUrl(item.storage_bucket || "school-media", item.storage_path);

      html += `
        <div class="admin-media-card">
          <div class="media-card-preview">
            ${isVideo 
              ? `<video src="${publicUrl}#t=0.5" preload="metadata"></video>` 
              : `<img src="${publicUrl}" alt="${escapeHtml(item.title)}" loading="lazy">`
            }
            <span class="media-type-tag">${isVideo ? '<i class="fas fa-play"></i> Video' : '<i class="fas fa-camera"></i> Photo'}</span>
          </div>
          <div class="media-card-content">
            <h4>${escapeHtml(item.title)}</h4>
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
            <div class="media-card-meta">
              <span>Category: <strong>${item.category}</strong></span>
              <span class="badge-status ${item.is_published ? 'badge-published' : 'badge-draft'}">
                ${item.is_published ? 'Published' : 'Hidden'}
              </span>
            </div>
          </div>
          <div class="media-card-actions">
            <button onclick="window.SSSPM_ADMIN.toggleMediaPublish('${item.id}', ${item.is_published})" title="Toggle Visibility">
              <i class="fas ${item.is_published ? 'fa-eye-slash' : 'fa-eye'}"></i> ${item.is_published ? 'Hide' : 'Publish'}
            </button>
            <button onclick="window.SSSPM_ADMIN.openEditMediaById('${item.id}')" title="Edit Details">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-card-delete" onclick="window.SSSPM_ADMIN.deleteMedia('${item.id}', '${item.storage_path}')" title="Delete Media">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ===========================================================================
  // ANNOUNCEMENTS MANAGEMENT CRUD
  // ===========================================================================
  function setupAnnouncementManagement() {
    const addBtn = document.getElementById("btnOpenAddAnnouncement");
    if (addBtn) addBtn.onclick = () => openAnnouncementModal();

    const form = document.getElementById("announcementForm");
    if (form) form.onsubmit = handleAnnouncementSubmit;
  }

  function openEditAnnouncementById(id) {
    const item = announcementsList.find(a => a.id === id);
    if (item) openAnnouncementModal(item);
  }

  function openAnnouncementModal(item = null) {
    const modal = document.getElementById("announcementModal");
    const form = document.getElementById("announcementForm");
    const titleEl = document.getElementById("announcementModalTitle");

    if (!modal || !form) return;
    form.reset();

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("announcementPublishDate").value = today;

    if (item) {
      titleEl.textContent = "Edit Announcement";
      document.getElementById("announcementEditId").value = item.id;
      document.getElementById("announcementTitleInput").value = item.title;
      document.getElementById("announcementDescInput").value = item.description;
      document.getElementById("announcementPublishDate").value = item.publish_date || today;
      document.getElementById("announcementExpiryDate").value = item.expiry_date || "";
      document.getElementById("announcementPublishedCheck").checked = item.is_published;
    } else {
      titleEl.textContent = "Post New Announcement";
      document.getElementById("announcementEditId").value = "";
      document.getElementById("announcementPublishedCheck").checked = true;
    }

    modal.style.display = "flex";
  }

  function closeAnnouncementModal() {
    const modal = document.getElementById("announcementModal");
    if (modal) modal.style.display = "none";
  }

  async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    const editId = document.getElementById("announcementEditId").value;
    const title = document.getElementById("announcementTitleInput").value.trim();
    const description = document.getElementById("announcementDescInput").value.trim();
    const publishDate = document.getElementById("announcementPublishDate").value;
    const expiryDate = document.getElementById("announcementExpiryDate").value || null;
    const isPublished = document.getElementById("announcementPublishedCheck").checked;

    const submitBtn = document.getElementById("announcementSubmitBtn");
    submitBtn.disabled = true;

    try {
      if (editId) {
        const { error } = await client
          .from("announcements")
          .update({
            title: title,
            description: description,
            publish_date: publishDate,
            expiry_date: expiryDate,
            is_published: isPublished
          })
          .eq("id", editId);

        if (error) throw error;
        showGlobalBanner("Announcement updated successfully.");
      } else {
        const { error } = await client
          .from("announcements")
          .insert([
            {
              title: title,
              description: description,
              publish_date: publishDate,
              expiry_date: expiryDate,
              is_published: isPublished
            }
          ]);

        if (error) throw error;
        showGlobalBanner("Announcement posted successfully.");
      }

      closeAnnouncementModal();
      await refreshAllData(false);
    } catch (err) {
      alert("Error saving announcement: " + err.message);
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function deleteAnnouncement(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    try {
      const { error } = await client.from("announcements").delete().eq("id", id);
      if (error) throw error;
      showGlobalBanner("Announcement removed.");
      await refreshAllData(false);
    } catch (e) {
      alert("Failed to delete announcement: " + e.message);
    }
  }

  function renderAdminAnnouncements() {
    const tbody = document.getElementById("announcementsTableBody");
    if (!tbody) return;

    if (announcementsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No announcements created yet.</td></tr>`;
      return;
    }

    let html = "";
    announcementsList.forEach(item => {
      html += `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td style="max-width: 320px;">${escapeHtml(item.description)}</td>
          <td>${item.publish_date || '-'}</td>
          <td>${item.expiry_date || 'No Expiry'}</td>
          <td>
            <span class="badge-status ${item.is_published ? 'badge-published' : 'badge-draft'}">
              ${item.is_published ? 'Active' : 'Hidden'}
            </span>
          </td>
          <td>
            <button class="btn btn-outline-sm" onclick="window.SSSPM_ADMIN.openEditAnnouncementById('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-sm" style="color: #dc2626;" onclick="window.SSSPM_ADMIN.deleteAnnouncement('${item.id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // ===========================================================================
  // DOCUMENTS MANAGEMENT CRUD
  // ===========================================================================
  function setupDocumentManagement() {
    const addBtn = document.getElementById("btnOpenAddDocument");
    if (addBtn) addBtn.onclick = () => openDocumentModal();

    const form = document.getElementById("documentForm");
    if (form) form.onsubmit = handleDocumentSubmit;
  }

  function openEditDocumentById(id) {
    const item = documentsList.find(d => d.id === id);
    if (item) openDocumentModal(item);
  }

  function openDocumentModal(item = null) {
    const modal = document.getElementById("documentModal");
    const form = document.getElementById("documentForm");
    const titleEl = document.getElementById("documentModalTitle");
    const fileInput = document.getElementById("documentFileInput");

    if (!modal || !form) return;
    form.reset();

    if (item) {
      titleEl.textContent = "Edit Document Details";
      document.getElementById("documentEditId").value = item.id;
      document.getElementById("documentExistingPath").value = item.storage_path;
      document.getElementById("documentTitleInput").value = item.title;
      document.getElementById("documentCategorySelect").value = item.category;
      document.getElementById("documentDescInput").value = item.description || "";
      document.getElementById("documentPublishedCheck").checked = item.is_published;
      if (fileInput) fileInput.required = false;
    } else {
      titleEl.textContent = "Upload Official Document";
      document.getElementById("documentEditId").value = "";
      document.getElementById("documentExistingPath").value = "";
      document.getElementById("documentPublishedCheck").checked = true;
      if (fileInput) fileInput.required = true;
    }

    modal.style.display = "flex";
  }

  function closeDocumentModal() {
    const modal = document.getElementById("documentModal");
    if (modal) modal.style.display = "none";
  }

  async function handleDocumentSubmit(e) {
    e.preventDefault();
    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    const editId = document.getElementById("documentEditId").value;
    const title = document.getElementById("documentTitleInput").value.trim();
    const category = document.getElementById("documentCategorySelect").value;
    const description = document.getElementById("documentDescInput").value.trim();
    const isPublished = document.getElementById("documentPublishedCheck").checked;
    const file = document.getElementById("documentFileInput").files[0];
    const existingPath = document.getElementById("documentExistingPath").value;

    const submitBtn = document.getElementById("documentSubmitBtn");
    submitBtn.disabled = true;

    try {
      let storagePath = existingPath;

      if (file) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uniqueFileName = `${category}/${Date.now()}_${cleanName}`;
        await window.SSSPM_BACKEND.uploadStorageFile("school-documents", uniqueFileName, file);
        storagePath = uniqueFileName;
      }

      if (editId) {
        const { error } = await client
          .from("documents")
          .update({
            title: title,
            category: category,
            description: description,
            is_published: isPublished,
            storage_path: storagePath
          })
          .eq("id", editId);

        if (error) throw error;
        showGlobalBanner("Document updated successfully.");
      } else {
        const { error } = await client
          .from("documents")
          .insert([
            {
              title: title,
              category: category,
              description: description,
              storage_bucket: "school-documents",
              storage_path: storagePath,
              is_published: isPublished
            }
          ]);

        if (error) throw error;
        showGlobalBanner("Document successfully uploaded.");
      }

      closeDocumentModal();
      await refreshAllData(false);
    } catch (err) {
      alert("Error saving document: " + err.message);
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function deleteDocument(id, storagePath) {
    if (!confirm("Are you sure you want to delete this official document?")) return;

    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    try {
      const { error: dbErr } = await client.from("documents").delete().eq("id", id);
      if (dbErr) throw dbErr;

      if (storagePath && !storagePath.startsWith("documents/") && !storagePath.startsWith("css/")) {
        try {
          await window.SSSPM_BACKEND.deleteStorageFile("school-documents", storagePath);
        } catch (stErr) {
          console.warn("Storage deletion error:", stErr);
        }
      }

      showGlobalBanner("Document deleted successfully.");
      await refreshAllData(false);
    } catch (e) {
      alert("Failed to delete document: " + e.message);
    }
  }

  function renderAdminDocuments() {
    const tbody = document.getElementById("documentsTableBody");
    if (!tbody) return;

    if (documentsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No documents found.</td></tr>`;
      return;
    }

    let html = "";
    documentsList.forEach(item => {
      const publicUrl = window.SSSPM_BACKEND.getPublicUrl(item.storage_bucket || "school-documents", item.storage_path);

      html += `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td><span class="badge-status badge-draft">${item.category}</span></td>
          <td style="max-width: 250px;">${escapeHtml(item.description || '-')}</td>
          <td>
            <a href="${publicUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-sm">
              <i class="fas fa-file-pdf"></i> View File
            </a>
          </td>
          <td>
            <span class="badge-status ${item.is_published ? 'badge-published' : 'badge-draft'}">
              ${item.is_published ? 'Yes' : 'No'}
            </span>
          </td>
          <td>
            <button class="btn btn-outline-sm" onclick="window.SSSPM_ADMIN.openEditDocumentById('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-sm" style="color: #dc2626;" onclick="window.SSSPM_ADMIN.deleteDocument('${item.id}', '${item.storage_path}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // ===========================================================================
  // CONTACT ENQUIRIES CRUD
  // ===========================================================================
  function setupEnquiriesManagement() {
    const filter = document.getElementById("enquiriesFilterStatus");
    if (filter) filter.onchange = renderAdminEnquiries;
  }

  function renderAdminEnquiries() {
    const tbody = document.getElementById("enquiriesTableBody");
    if (!tbody) return;

    const filterStatus = document.getElementById("enquiriesFilterStatus")?.value || "all";

    const filtered = enquiriesList.filter(item => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No enquiries match this filter.</td></tr>`;
      return;
    }

    let html = "";
    filtered.forEach(item => {
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "-";

      html += `
        <tr>
          <td>
            <select class="select-control" style="font-size: 11px; padding: 4px 6px;" onchange="window.SSSPM_ADMIN.updateEnquiryStatus('${item.id}', this.value)">
              <option value="new" ${item.status === 'new' ? 'selected' : ''}>New</option>
              <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </td>
          <td>${dateStr}</td>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>
            <div style="font-size: 12px;">
              <a href="mailto:${escapeHtml(item.email)}"><i class="fas fa-envelope"></i> ${escapeHtml(item.email)}</a>
              ${item.phone ? `<br><a href="tel:${escapeHtml(item.phone)}"><i class="fas fa-phone"></i> ${escapeHtml(item.phone)}</a>` : ""}
            </div>
          </td>
          <td>${escapeHtml(item.subject)}</td>
          <td>
            <button class="btn btn-outline-sm" onclick="window.SSSPM_ADMIN.viewEnquiryModalById('${item.id}')" title="Details">
              <i class="fas fa-eye"></i> Details
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  async function updateEnquiryStatus(id, newStatus) {
    const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
    if (!client) return;

    try {
      const { error } = await client
        .from("contact_enquiries")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      showGlobalBanner(`Enquiry status updated to ${newStatus}.`);
      await refreshAllData(false);
    } catch (e) {
      alert("Failed to update status: " + e.message);
    }
  }

  function viewEnquiryModalById(id) {
    const item = enquiriesList.find(e => e.id === id);
    if (item) viewEnquiryModal(item);
  }

  function viewEnquiryModal(item) {
    const modal = document.getElementById("enquiryModal");
    const body = document.getElementById("enquiryModalBody");
    const deleteBtn = document.getElementById("enquiryDeleteBtn");

    if (!modal || !body) return;

    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <span class="badge-status badge-${item.status}">Status: ${item.status}</span>
        <span style="font-size: 12px; color: #64748b;">${new Date(item.created_at).toLocaleString("en-IN")}</span>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Sender</label>
        <p style="font-size: 15px; font-weight: 600;">${escapeHtml(item.name)}</p>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 14px;">
        <div>
          <label style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Email</label>
          <p><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></p>
        </div>
        ${item.phone ? `
          <div>
            <label style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Phone</label>
            <p><a href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone)}</a></p>
          </div>
        ` : ''}
      </div>

      <div style="margin-bottom: 14px;">
        <label style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Subject</label>
        <p style="font-weight: 600;">${escapeHtml(item.subject)}</p>
      </div>

      <div>
        <label style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Message</label>
        <div style="padding: 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap; margin-top: 4px; font-size: 14px;">
          ${escapeHtml(item.message)}
        </div>
      </div>
    `;

    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm("Delete this enquiry?")) {
          const client = window.SSSPM_BACKEND ? window.SSSPM_BACKEND.getClient() : null;
          if (client) {
            await client.from("contact_enquiries").delete().eq("id", item.id);
            closeEnquiryModal();
            showGlobalBanner("Enquiry deleted.");
            await refreshAllData(false);
          }
        }
      };
    }

    modal.style.display = "flex";
  }

  function closeEnquiryModal() {
    const modal = document.getElementById("enquiryModal");
    if (modal) modal.style.display = "none";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAdmin();
    setupMediaManagement();
    setupAnnouncementManagement();
    setupDocumentManagement();
    setupEnquiriesManagement();
  });
})();
