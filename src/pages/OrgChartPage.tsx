import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface OrgChartNode {
  nodeId: string;
  parentId: string | null;
  structureId: string;
  name: string;
  position: string;
  orderIndex: number;
}

const OrgChartDetailPage = () => {
  const { structureId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgChart = async (structureId: string) => {
    try {
      const res = await fetch("/api/orgchart-by-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ structureId }),
      });

      const json = await res.json();
      setData(json.response || []);
    } catch (err) {
      console.error("Error fetching org chart:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (structureId) fetchOrgChart();
  }, [structureId]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#272e79]">
          Struktur Organisasi — {structureId}
        </h1>

        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-rose-400 text-white rounded-lg hover:bg-rose-500"
        >
          ← Kembali
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-gray-500 animate-pulse">
          Mengambil data struktur organisasi...
        </p>
      )}

      {/* LIST ORGCHART */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((node) => (
            <div
              key={node.nodeId}
              className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold text-[#272e79]">{node.name}</h2>
              <p className="text-gray-600">{node.position}</p>

              <div className="text-xs text-gray-500 mt-3">
                Node ID: {node.nodeId} <br />
                Parent: {node.parentId || "ROOT"} <br />
                Order: {node.orderIndex}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data.length === 0 && (
        <p className="text-center text-gray-500 mt-10">
          Tidak ada data org chart untuk struktur ini.
        </p>
      )}
    </div>
  );
};

export default OrgChartDetailPage;
