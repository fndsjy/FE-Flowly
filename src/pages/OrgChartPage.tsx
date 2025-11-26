// OrgChartPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import { Tree, TreeNode } from "react-organizational-chart";
import { useToast } from "../components/organisms/MessageToast";

interface OrgChartNode {
  nodeId: string;
  parentId: string | null;
  structureId: string;
  name: string;
  position: string;
  orderIndex: number;
}

interface OrgStructure {
  structureId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const domasColor = "#272e79";

const OrgChartPage = () => {
  const { structureId } = useParams<{ structureId: string }>();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [data, setData] = useState<OrgChartNode[]>([]);
  const [structureName, setStructureName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔐 Role-based access
  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const isAdmin = roleLevel === 1;
  const { showToast } = useToast();

  /* ---------------- FETCH PROFILE (for role) ---------------- */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json();
        if (res.ok) setRoleLevel(json.response?.roleLevel || null);
      } catch (err) {
        console.error("Gagal mengambil profil:", err);
      }
    };
    fetchProfile();
  }, []);

  /* ---------------- FETCH NAMA STRUKTUR ---------------- */
  const fetchStructureName = async (id: string) => {
    try {
      const res = await fetch(`/api/orgstructure`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return;
      const list: OrgStructure[] = (await res.json()).response || [];
      const found = list.find((item) => item.structureId === id);
      setStructureName(found?.name || "");
    } catch (err) {
      console.log("Gagal mengambil nama struktur:", err);
    }
  };

  /* ---------------- FETCH ORGCHART ---------------- */
  const fetchOrgChart = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/orgchart-by-structure?structureId=${id}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json.response || []);
    } catch (err) {
      setError("Gagal mengambil data struktur organisasi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (structureId) {
      fetchStructureName(structureId);
      fetchOrgChart(structureId);
    }
  }, [structureId]);

  /* ---------------- MODAL STATE ---------------- */
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({
    nodeId: "",
    structureId: structureId || "",
    name: "",
    position: "",
    parentId: "", // only used for adding under parent; not editable
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    nodeId: string;
    name: string;
  }>({ open: false, nodeId: "", name: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ---------------- HANDLERS ---------------- */

  const openAddModal = (parentId: string | null = null) => {
    setFormMode("add");
    setFormData({
      nodeId: "",
      structureId: structureId || "",
      name: "",
      position: "",
      parentId: parentId || "",
    });
    setShowForm(true);
  };

  const openEditModal = (item: OrgChartNode) => {
    setFormMode("edit");
    setFormData({
      nodeId: item.nodeId,
      structureId: item.structureId,
      name: item.name,
      position: item.position,
      parentId: item.parentId || "", // not used in form
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!structureId) return;

    setIsSubmitting(true);

    try {
      const url = "/api/orgchart";
      const method = formMode === "add" ? "POST" : "PUT";

      // ✅ Only send name & position for update
      const body =
        formMode === "add"
          ? {
              structureId: structureId,
              name: formData.name,
              position: formData.position,
              parentId: formData.parentId || null,
            }
          : {
              nodeId: formData.nodeId,
              name: formData.name,
              position: formData.position,
            };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal menyimpan data.", "error");
        return; // keep modal open on error
      }

      showToast(
        formMode === "add"
          ? "Anggota berhasil ditambahkan! 🎉"
          : "Data anggota berhasil diperbarui! ✨",
        "success"
      );

      setShowForm(false); // ✅ close only on success
      await fetchOrgChart(structureId);
    } catch (err) {
      console.error("Error submit node:", err);
      showToast("Terjadi kesalahan saat menyimpan data.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch("/api/orgchart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nodeId: deleteConfirm.nodeId }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal menghapus node.", "error");
        setDeleteConfirm({ open: false, nodeId: "", name: "" }); // ✅ close on error too
        return;
      }

      showToast("Node berhasil dihapus (soft delete) 🗑️", "success");
      setDeleteConfirm({ open: false, nodeId: "", name: "" }); // ✅ always close
      await fetchOrgChart(structureId!);
    } catch (err) {
      console.error("Error delete node:", err);
      showToast("Terjadi kesalahan saat menghapus.", "error");
      setDeleteConfirm({ open: false, nodeId: "", name: "" }); // ✅ close on network error
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---------------- NODE CARD ---------------- */
  const OrgNodeCard = ({
    name,
    position,
    nodeId,
    parentId,
    isRoot = false,
  }: {
    name: string;
    position: string;
    nodeId: string;
    parentId: string | null;
    isRoot?: boolean;
  }) => (
    <div
      className={`inline-block border rounded-xl px-4 py-3 text-center shadow-lg ${
        isRoot
          ? "bg-gradient-to-b from-rose-400 to-rose-300 text-white shadow-rose-400/10"
          : "bg-white border-gray-200 shadow-gray-400 text-gray-800"
      }`}
    >
      <h4 className={`font-bold text-lg ${isRoot ? "" : "text-[#272e79]"}`}>
        {name}
      </h4>
      <p className="text-sm opacity-90">{position}</p>

      {/* 🔧 Admin-only action buttons */}
      {isAdmin && (
        <div className="mt-2 flex justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAddModal(nodeId);
            }}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
            title="Tambah bawahan"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const node = data.find((n) => n.nodeId === nodeId);
              if (node) openEditModal(node);
            }}
            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
            title="Edit"
          >
            <i className="fa-regular fa-pen-to-square"></i>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({
                open: true,
                nodeId: nodeId,
                name: name,
              });
            }}
            className="text-xs bg-rose-500 hover:bg-rose-600 text-white px-2 py-1 rounded"
            title="Hapus"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      )}
    </div>
  );

  /* ---------------- TREE RENDER ---------------- */
  const buildTree = (parentId: string | null) => {
    const children = data.filter((item) => item.parentId === parentId);

    return children.map((child) => (
      <TreeNode
        key={child.nodeId}
        label={
          <OrgNodeCard
            name={child.name}
            position={child.position}
            nodeId={child.nodeId}
            parentId={child.parentId}
          />
        }
      >
        {buildTree(child.nodeId)}
      </TreeNode>
    ));
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-[#272e79] shadow-lg shadow-gray-400 hover:bg-gray-100"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
              Detail Struktur {structureName || structureId}
            </h1>
          </div>

          {/* 🔑 Admin-only: Add Root Node */}
          {isAdmin && (
            <button
              onClick={() => openAddModal(null)}
              className="px-4 py-2 flex items-center gap-2 bg-[#272e79] text-white rounded-xl shadow hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79]"
            >
              <i className="fa-solid fa-plus"></i>
              Tambah Root
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-600 bg-red-100 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-gray-500 animate-pulse">
            Mengambil data struktur organisasi...
          </p>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="text-center my-10">
            <p className="text-gray-500 mb-4">Belum ada anggota dalam struktur ini.</p>
            {isAdmin && (
              <button
                onClick={() => openAddModal(null)}
                className="px-4 py-2 bg-rose-400 text-white rounded-lg"
              >
                + Tambah Root
              </button>
            )}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="p-4 rounded-2xl overflow-auto">
            <Tree
              lineWidth={"2px"}
              lineColor={"#ec5c76"}
              lineBorderRadius={"8px"}
              label={
                <div className="inline-block rounded-xl px-5 py-3 text-center shadow-rose-400/20">
                  <h4 className="font-bold text-xl">{structureName || "Struktur"}</h4>
                  <p className="text-sm opacity-90">Virtual Root</p>
                </div>
              }
            >
              {data
                .filter((node) => node.parentId === null)
                .map((rootNode) => (
                  <TreeNode
                    key={rootNode.nodeId}
                    label={
                      <OrgNodeCard
                        name={rootNode.name}
                        position={rootNode.position}
                        nodeId={rootNode.nodeId}
                        parentId={rootNode.parentId}
                        isRoot={true}
                      />
                    }
                  >
                    {buildTree(rootNode.nodeId)}
                  </TreeNode>
                ))}
            </Tree>
          </div>
        )}
      </div>

      {/* ✏️ Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 max-w-[90vw]">
            <h2 className="font-bold text-xl mb-4 text-[#272e79]">
              {formMode === "add" ? "Tambah Anggota" : "Edit Anggota"}
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 outline-none"
                required
              />

              <input
                type="text"
                placeholder="Posisi / Jabatan"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 outline-none"
                required
              />
              {/* ✅ No parentId field in edit mode */}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-rose-500"
                }`}
              >
                {isSubmitting ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Delete Confirm */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 text-center">
            <img src="/images/delete-confirm.png" alt="Delete Confirmation" className="w-40 mx-auto" />
            {/* <div className="bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-rose-500 text-2xl"></i>
            </div> */}
            <h3 className="font-semibold text-lg">
              Hapus <span className="text-rose-500">{deleteConfirm.name}</span>?
            </h3>
            <p className="text-gray-600 mt-2 text-sm">
              Data akan sulit dipulihkan
            </p>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm({ open: false, nodeId: "", name: "" })}
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isDeleting ? "opacity-60 cursor-not-allowed" : "hover:bg-rose-600"
                }`}
              >
                {isDeleting ? "Menghapus…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChartPage;