import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../components/ToastContainer";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { studentAPI } from "../services/api";
import ExcelUploader from "../components/ExcelUploader";
import Pagination from "../components/Pagination";
import BulkIssueDialog from "../components/BulkIssueDialog";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import { Users, Trash2, Upload, Pencil, X, Search, Filter, CheckSquare, Square, Award } from "lucide-react";

export default React.memo(function StudentsPage() {
  const confirm = useConfirmDialog();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchChips, setSearchChips] = useState([]);
  const [programFilter, setProgramFilter] = useState("");
  const [graduationYearFilter, setGraduationYearFilter] = useState("");
  const [showBulkIssue, setShowBulkIssue] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [editForm, setEditForm] = useState({
    student_id: "",
    full_name: "",
    email: "",
    program: "",
    graduation_date: "",
    cohort: "",
  });

  // Filter dropdown options (fetched once)
  const [uniquePrograms, setUniquePrograms] = useState([]);
  const [uniqueGraduationYears, setUniqueGraduationYears] = useState([]);

  // Debounce search
  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudents(new Set());
    setSelectAll(false);
  }, [programFilter, graduationYearFilter, searchChips.length]);

  // Build query params
  const buildParams = useCallback(() => {
    const params = { page: currentPage, page_size: itemsPerPage };
    if (debouncedSearch) params.search = debouncedSearch;
    if (searchChips.length > 0) params.ids = searchChips.join(",");
    if (programFilter) params.program = programFilter;
    if (graduationYearFilter) params.graduation_year = graduationYearFilter;
    return params;
  }, [currentPage, itemsPerPage, debouncedSearch, searchChips, programFilter, graduationYearFilter]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await studentAPI.getAll(buildParams());
      const results = data?.results || (Array.isArray(data) ? data : []);
      const count = data?.count ?? results.length;
      setStudents(results);
      setTotalItems(count);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch filter dropdown options once
  useEffect(() => {
    (async () => {
      try {
        const { data } = await studentAPI.getAll({ page: 1, page_size: 200 });
        const results = data?.results || (Array.isArray(data) ? data : []);
        setUniquePrograms([...new Set(results.map(s => s.program).filter(Boolean))].sort());
        setUniqueGraduationYears(
          [...new Set(results.map(s => {
            const d = s.graduation_date;
            return d ? new Date(d).getFullYear().toString() : null;
          }).filter(Boolean))].sort((a, b) => b - a)
        );
      } catch { /* ignore */ }
    })();
  }, []);

  // Pagination (server-side)
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedStudents(new Set());
    setSelectAll(false);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleProgramFilterChange = useCallback((value) => {
    setProgramFilter(value);
  }, []);

  const handleGraduationYearFilterChange = useCallback((value) => {
    setGraduationYearFilter(value);
  }, []);

  // Selection handlers
  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    
    // Update select all state
    setSelectAll(newSelected.size === students.length && students.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
    } else {
      const allIds = new Set(students.map(s => s.id));
      setSelectedStudents(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    const count = selectedStudents.size;
    const selectedIds = Array.from(selectedStudents);

    const confirmed = await confirm({
      title: 'Delete Students',
      message: `Are you sure you want to delete ${count} student${count > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    // Optimistic update
    const snapshot = students;
    setStudents(prev => prev.filter(s => !selectedStudents.has(s.id)));
    setSelectedStudents(new Set());
    setSelectAll(false);

    try {
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await studentAPI.delete(id);
            return { success: true, id };
          } catch (error) {
            return { success: false, id, error };
          }
        })
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        toast.success(`Successfully deleted ${successful.length} student${successful.length > 1 ? 's' : ''}!`);
      }

      if (failed.length > 0) {
        // Rollback and re-fetch on partial failure
        toast.error(`Failed to delete ${failed.length} student${failed.length > 1 ? 's' : ''}.`);
        fetchStudents();
      }
    } catch (error) {
      // Full rollback
      setStudents(snapshot);
      toast.error("Failed to delete students. Please try again.");
    }
  };

  const handleBulkImport = async (mappedData) => {
    try {
      await studentAPI.bulkCreate(mappedData);
      toast.success(`Successfully imported ${mappedData.length} students!`);
      setShowUploader(false);
      fetchStudents();
    } catch (error) {
      console.error("Import failed:", error);
      console.error("Import error details:", error.response?.data);
      toast.error("Failed to import students");
    }
  };

  const handleDelete = async (id) => {
    // Find the student to get their name for the dialog
    const student = students.find(s => s.id === id);
    const studentName = student?.full_name || 'this student';

    const confirmed = await confirm({
      title: 'Delete Student',
      message: `Are you sure you want to delete ${studentName}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    // Optimistic update - remove from UI immediately
    const originalStudents = [...students];
    setStudents(students.filter(s => s.id !== id));
    toast.success("Student deleted successfully");

    try {
      await studentAPI.delete(id);
    } catch (error) {
      console.error("Delete failed:", error);

      // Rollback the optimistic update
      setStudents(originalStudents);

      if (error.response?.status === 404) {
        toast.error("Student not found. They may have been already deleted.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to delete students.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error(`Failed to delete student: ${error.message || 'Unknown error'}`);
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
      toast.success("Student updated successfully!");
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
      toast.error(message ? `Failed to update student. ${message}` : "Failed to update student.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading students">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Student Management"
        description="View and manage student records"
        showSearch={false}
      />

      {/* Action bar — visible when students are selected */}
      {selectedStudents.size > 0 && (
        <div className="flex items-center gap-3 mb-6">
          {selectedStudents.size > 1 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium transition"
            >
              <Trash2 size={16} />
              Delete {selectedStudents.size} Student{selectedStudents.size > 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={() => setShowBulkIssue(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition"
          >
            <Award size={16} />
            Issue {selectedStudents.size} Certificate{selectedStudents.size > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Tokenized chip search */}
          <div className="flex-1">
            <label htmlFor="student-search" className="sr-only">Search students</label>
            <div className="flex flex-wrap items-center gap-1.5 min-h-9.5 px-3 py-1.5 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 bg-white transition">
              <Search size={16} className="text-slate-400 shrink-0" />
              {searchChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold"
                >
                  {chip}
                  <button
                    type="button"
                    onClick={() =>
                      setSearchChips((prev) => prev.filter((c) => c !== chip))
                    }
                    className="hover:text-blue-600"
                    aria-label={`Remove ${chip}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                id="student-search"
                type="text"
                placeholder={
                  searchChips.length > 0
                    ? "Add another ID…"
                    : "Search by name, email, or type IDs and press Enter…"
                }
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && searchTerm.trim()) {
                    e.preventDefault();
                    const val = searchTerm.trim().replace(/,$/, "");
                    if (val && !searchChips.includes(val)) {
                      setSearchChips((prev) => [...prev, val]);
                    }
                    handleSearchChange("");
                  }
                  if (
                    e.key === "Backspace" &&
                    !searchTerm &&
                    searchChips.length > 0
                  ) {
                    setSearchChips((prev) => prev.slice(0, -1));
                  }
                }}
                className="flex-1 min-w-30 border-0 outline-none text-sm bg-transparent p-0 focus:ring-0"
              />
            </div>
          </div>

          {/* Program Filter */}
          <div className="lg:w-48">
            <div className="relative">
              <label htmlFor="program-filter" className="sr-only">Filter by program</label>
              <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                id="program-filter"
                value={programFilter}
                onChange={(e) => handleProgramFilterChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none text-sm transition"
              >
                <option value="">All Programs</option>
                {uniquePrograms.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Graduation Year Filter */}
          <div className="lg:w-48">
            <div className="relative">
              <label htmlFor="year-filter" className="sr-only">Filter by graduation year</label>
              <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                id="year-filter"
                value={graduationYearFilter}
                onChange={(e) => handleGraduationYearFilterChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none text-sm transition"
              >
                <option value="">All Years</option>
                {uniqueGraduationYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || searchChips.length > 0 || programFilter || graduationYearFilter) && (
            <button
              onClick={() => {
                handleSearchChange("");
                setSearchChips([]);
                handleProgramFilterChange("");
                handleGraduationYearFilterChange("");
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-2 transition"
            >
              <X size={16} />
              Clear Filters
            </button>
          )}

          <button
            onClick={() => setShowUploader(!showUploader)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition"
          >
            <Upload size={16} />
            {showUploader ? "Cancel" : "Import"}
          </button>
        </div>
      </div>

      {showUploader && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <ExcelUploader onDataParsed={handleBulkImport} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-(--color-brand-dark)">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-white transition hover:text-white/80"
                >
                  {selectAll ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>Select All</span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                Graduation Year
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleSelectStudent(student.id)}
                    className="hover:text-slate-700"
                    aria-label={selectedStudents.has(student.id) ? 'Deselect student' : 'Select student'}
                  >
                    {selectedStudents.has(student.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {student.student_id}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {student.full_name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {student.email}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {student.program}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {student.graduation_date ? new Date(student.graduation_date).getFullYear() : ""}
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(student)}
                    className="rounded-lg p-2 text-blue-600 shadow-sm transition-colors duration-200 hover:bg-blue-50 hover:text-blue-800"
                    aria-label={`Edit ${student.full_name}`}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="rounded-lg p-2 text-red-600 shadow-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-800"
                    aria-label={`Delete ${student.full_name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>
              {!searchTerm && !searchChips.length && !programFilter && !graduationYearFilter
                ? "No students found. Import from Excel to get started."
                : "No students match your search criteria."
              }
            </p>
            {(searchTerm || searchChips.length > 0 || programFilter || graduationYearFilter) && (
              <button
                onClick={() => {
                  handleSearchChange("");
                  setSearchChips([]);
                  handleProgramFilterChange("");
                  handleGraduationYearFilterChange("");
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 transition"
              >
                Clear filters to see all students
              </button>
            )}
          </div>
        ) : (
          <>
            {totalPages >= 1 && (
              <div className="px-6 py-4 border-t border-slate-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={totalItems}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={!!editingStudent} onClose={closeEditModal} title="Edit Student">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-student-id" className="block text-sm font-medium text-slate-700 mb-1">
              Student ID
            </label>
            <input
              id="edit-student-id"
              type="text"
              name="student_id"
              value={editForm.student_id}
              onChange={handleEditChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-full-name" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              id="edit-full-name"
              type="text"
              name="full_name"
              value={editForm.full_name}
              onChange={handleEditChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              name="email"
              value={editForm.email}
              onChange={handleEditChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-program" className="block text-sm font-medium text-slate-700 mb-1">
              Program
            </label>
            <input
              id="edit-program"
              type="text"
              name="program"
              value={editForm.program}
              onChange={handleEditChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-grad-year" className="block text-sm font-medium text-slate-700 mb-1">
              Graduation Year
            </label>
            <input
              id="edit-grad-year"
              type="number"
              name="graduation_date"
              value={editForm.graduation_date ? new Date(editForm.graduation_date).getFullYear() : ""}
              onChange={(e) => {
                const year = e.target.value;
                const date = year ? `${year}-12-31` : "";
                setEditForm(prev => ({ ...prev, graduation_date: date }));
              }}
              placeholder="e.g., 2024"
              min="2000"
              max="2030"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Enter graduation year (e.g., 2024)</p>
          </div>

          <div>
            <label htmlFor="edit-cohort" className="block text-sm font-medium text-slate-700 mb-1">
              Cohort (optional)
            </label>
            <input
              id="edit-cohort"
              type="text"
              name="cohort"
              value={editForm.cohort}
              onChange={handleEditChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={closeEditModal}
              className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <BulkIssueDialog
        open={showBulkIssue}
        onClose={() => setShowBulkIssue(false)}
        students={students.filter((s) => selectedStudents.has(s.id))}
        onComplete={() => {
          setSelectedStudents(new Set());
          setSelectAll(false);
        }}
      />
    </div>
  );
});
