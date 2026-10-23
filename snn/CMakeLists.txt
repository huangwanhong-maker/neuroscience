add_library(neuroscience_snn INTERFACE)
add_library(neuroscience::snn ALIAS neuroscience_snn)
target_include_directories(neuroscience_snn INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_features(neuroscience_snn INTERFACE cxx_std_20)
target_link_libraries(neuroscience_snn INTERFACE
  calx::random calx::linalg calx::integrators calx::scheduler calx::special_functions calx::quadrature calx::solvers calx::signal
  physis::units physis::dynamics physis::quantum)

# The command-line simulator: snn run <spec.json>, snn models.
add_executable(snn tools/snn.cpp)
target_link_libraries(snn PRIVATE neuroscience::snn)

# Benchmarks (not checks): the Brunel network at several sizes and thread counts.
add_executable(snn_benchmark benchmarks/brunel.cpp)
target_link_libraries(snn_benchmark PRIVATE neuroscience::snn)

if(NEUROSCIENCE_CHECKS)
  calx_add_check(check_snn_models SOURCES tests/check_models.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_excitability SOURCES tests/check_excitability.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_quantum SOURCES tests/check_quantum.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_analysis SOURCES tests/check_analysis.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_network SOURCES tests/check_network.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_plasticity SOURCES tests/check_plasticity.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_theory SOURCES tests/check_theory.cpp LIBRARIES neuroscience::snn)
  calx_add_check(check_snn_spec SOURCES tests/check_spec.cpp LIBRARIES neuroscience::snn)
endif()
