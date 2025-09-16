import EventDashboard from "@/components/EventDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

const Index = () => {
  return (
    <ProtectedRoute>
      <EventDashboard />
    </ProtectedRoute>
  );
};

export default Index;
