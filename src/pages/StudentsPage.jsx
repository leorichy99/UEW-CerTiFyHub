import { useState, useEffect } from "react";
import { studentAPI } from "../services/api";
import ExcelUploader from "../components/ExcelUploader";
import { Users, Trash2, Upload, Pencil, X } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    student_id: "",
    full_name: "",
    email: "",
    program: "",
    graduation_date: "",
    cohort: "",
  });

  const fetchStudents = async () => {
    try {
      const { data } = await studentAPI.getAll();
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleBulkImport = async (mappedData) => {
    try {
      await studentAPI.bulkCreate(mappedData);
      alert(`Successfully imported ${mappedData.length} students!`);
      setShowUploader(false);
      fetchStudents();
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import students");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        await studentAPI.delete(id);
        fetchStudents();
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditForm({
      student_id: student.student_id || "",
      full_name: student.full_name || "",
      email: student.email || "",
      program: student.program || "",
      graduation_date: student.graduation_date || "",
      cohort: student.cohort || "",
    });
  };

  const closeEditModal = () => {
    setEditingStudent(null);
    setEditForm({
      student_id: "",
      full_name: "",
      email: "",
      program: "",
      graduation_date: "",
      cohort: "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      await studentAPI.update(editingStudent.id, editForm);
      alert("Student updated successfully!");
      closeEditModal();
      fetchStudents();
    } catch (error) {
      console.error("Update failed:", error);
      const details = error?.response?.data;
      const message =
        (typeof details === "string" && details) ||
        details?.error ||
        details?.detail ||
        (details ? JSON.stringify(details) : "");
      alert(message ? `Failed to update student. ${message}` : "Failed to update student.");
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading students...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={28} />
          Student Management
        </h2>
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Upload size={20} />
          {showUploader ? "Cancel" : "Import from Excel"}
        </button>
      </div>

      {showUploader && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <ExcelUploader onDataParsed={handleBulkImport} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Graduation
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {student.student_id}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {student.full_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {student.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {student.program}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {student.graduation_date}
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(student)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Edit student"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete student"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No students found. Import from Excel to get started.
          </div>
        )}
      </div>

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Student</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={editForm.student_id}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program
                </label>
                <input
                  type="text"
                  name="program"
                  value={editForm.program}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Graduation Date
                </label>
                <input
                  type="date"
                  name="graduation_date"
                  value={editForm.graduation_date}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cohort (optional)
                </label>
                <input
                  type="text"
                  name="cohort"
                  value={editForm.cohort}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
