// The benchmark of spiking simulators: Brunel's (2000) sparse network of excitatory and
// inhibitory neurons in its asynchronous irregular state (model A, g = 5, eta = 2, J = 0.1 mV,
// D = 1.5 ms, 10 % connectivity), as NEST's hpc_benchmark and brunel_delta examples use it.
//
//   snn_benchmark [scale = 1] [seconds = 1] [threads ...]
//
// scale 1 is Brunel's own network: 10,000 excitatory and 2,500 inhibitory neurons, each
// receiving 1,000 and 250 synapses (15.6 million in all). For each number of threads it
// reports the time to build the connectivity, the time to simulate, the real-time factor
// (wall time over simulated time), the mean rate, and the synaptic events delivered per
// second of wall time.

#include <neuroscience/snn/snn.hpp>

#include <cstdio>
#include <cstdlib>
#include <thread>
#include <vector>

using namespace neuroscience::snn;

int main(int argc, char** argv) {
  const double scale = argc > 1 ? std::atof(argv[1]) : 1.0;
  const double T = argc > 2 ? std::atof(argv[2]) : 1.0;
  std::vector<std::size_t> threads;
  for (int i = 3; i < argc; i++) threads.push_back(static_cast<std::size_t>(std::atoi(argv[i])));
  if (threads.empty()) threads = {1, 2, 4, std::max(1u, std::thread::hardware_concurrency())};
  const auto NE = static_cast<std::size_t>(10000 * scale), NI = NE / 4, CE = NE / 10, CI = NI / 10;
  std::printf("Brunel 2000, model A: %zu + %zu neurons, %zu + %zu synapses each, %.2f s simulated\n", NE, NI, CE, CI, T);
  std::printf("%8s %10s %10s %10s %10s %14s\n", "threads", "build s", "run s", "RTF", "rate Hz", "events/s");
  for (std::size_t th : threads) {
    theory::Brunel b;
    b.C_E = static_cast<double>(CE);
    Network net({0.1e-3, 1, th});
    models::LifPscDelta::Params p;
    p.tau_m = b.tau; p.t_ref = b.tau_rp; p.E_L = 0; p.V_reset = b.V_r; p.V_th = b.theta;
    auto& E = net.add<models::LifPscDelta>("E", NE, p);
    auto& I = net.add<models::LifPscDelta>("I", NI, p);
    for (Population* t : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
      net.connect(E, *t, "delta", Connectivity::fixed_indegree(CE, false), Distribution::constant(b.J), Distribution::constant(1.5e-3));
      net.connect(I, *t, "delta", Connectivity::fixed_indegree(CI, false), Distribution::constant(-b.g * b.J), Distribution::constant(1.5e-3));
      auto x = std::make_unique<PoissonInput>();
      x->target = t;
      x->rate = 2 * b.nu_thr() * CE;
      x->weight = b.J;
      net.add_device(std::move(x));
    }
    net.initialise(E, 0, {Distribution::Kind::uniform, 0, b.theta});
    net.initialise(I, 0, {Distribution::Kind::uniform, 0, b.theta});
    net.run(T);
    const auto& st = net.statistics();
    // run() builds before its clock starts: wall is the simulation alone.
    std::printf("%8zu %10.2f %10.2f %10.2f %10.2f %14.3e\n", th, st.build, st.wall, st.wall / T,
                static_cast<double>(st.spikes) / (NE + NI) / T, static_cast<double>(st.events) / st.wall);
    std::fflush(stdout);
  }
  return 0;
}
