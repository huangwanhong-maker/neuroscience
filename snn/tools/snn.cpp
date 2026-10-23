// snn: the command-line simulator of the neuroscience domain's spiking networks.
//
//   snn run <spec.json | -> [--out <results.json>] [--threads N] [--seed S] [--duration T]
//   snn models          every model, its parameters, components and receptors, as JSON
//   snn version
//
// It reads only the file it is given (or standard input) and writes only the results it is
// asked for; the library it runs is pure.

#include <neuroscience/snn/snn.hpp>

#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <sstream>
#include <string>

using namespace neuroscience::snn;

namespace {

int usage() {
  std::cerr << "usage:\n"
               "  snn run <spec.json | -> [--out <results.json>] [--threads N] [--seed S] [--duration T]\n"
               "  snn models\n"
               "  snn version\n";
  return 2;
}

std::string slurp(const std::string& path) {
  if (path == "-") return {std::istreambuf_iterator<char>(std::cin), std::istreambuf_iterator<char>()};
  std::ifstream f(path, std::ios::binary);
  if (!f) throw std::runtime_error("cannot read " + path);
  std::ostringstream s;
  s << f.rdbuf();
  return s.str();
}

}  // namespace

int main(int argc, char** argv) {
  if (argc < 2) return usage();
  const std::string command = argv[1];
  try {
    if (command == "version") {
      std::cout << "snn 0.1 (neuroscience domain, The Science Infrastructures)\n";
      return 0;
    }
    if (command == "models") {
      std::cout << models_json().dump(2) << "\n";
      return 0;
    }
    if (command != "run" || argc < 3) return usage();
    Json spec = Json::parse(slurp(argv[2]));
    std::string out_path;
    for (int i = 3; i < argc; i++) {
      const std::string a = argv[i];
      auto next = [&]() -> std::string { if (i + 1 >= argc) throw std::invalid_argument(a + " needs a value"); return argv[++i]; };
      if (a == "--out") out_path = next();
      else if (a == "--threads") spec.set("threads", std::stod(next()));
      else if (a == "--seed") spec.set("seed", std::stod(next()));
      else if (a == "--duration") spec.set("duration", next());
      else return usage();
    }
    Built b = build(spec);
    if (!(b.duration > 0)) throw std::invalid_argument("the specification needs a positive duration");
    b.network->run(b.duration);
    const std::string text = results(b).dump();
    if (out_path.empty()) std::cout << text << "\n";
    else {
      std::ofstream f(out_path, std::ios::binary);
      if (!f) throw std::runtime_error("cannot write " + out_path);
      f << text << "\n";
    }
    const auto& st = b.network->statistics();
    std::cerr << "snn: " << b.duration << " s simulated in " << st.wall << " s (" << st.spikes << " spikes, " << st.events
              << " synaptic events, " << b.network->synapses() << " synapses, " << b.network->settings().threads << " threads)\n";
    return 0;
  } catch (const std::exception& e) {
    std::cerr << "snn: " << e.what() << "\n";
    return 1;
  }
}
