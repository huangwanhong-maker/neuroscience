# The neuroscience domain's C++: networks of spiking neurons (snn/).
#
# The domain uses calx and physis. Inside The Science Infrastructures they are the sibling
# foundations (added here when no larger project has added them); built alone elsewhere,
# they would be fetched at pinned versions (not yet written).

cmake_minimum_required(VERSION 3.20)
project(neuroscience LANGUAGES CXX)

if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
  set(NEUROSCIENCE_TOP_LEVEL ON)
else()
  set(NEUROSCIENCE_TOP_LEVEL OFF)
endif()
option(NEUROSCIENCE_CHECKS "Build the neuroscience domain's checks" ${NEUROSCIENCE_TOP_LEVEL})

if(NOT DEFINED CMAKE_CXX_STANDARD)
  set(CMAKE_CXX_STANDARD 20)
  set(CMAKE_CXX_STANDARD_REQUIRED ON)
  set(CMAKE_CXX_EXTENSIONS OFF)
endif()
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(SCIENCE_FOUNDATIONS ${CMAKE_CURRENT_SOURCE_DIR}/../../foundations)
if(NOT TARGET calx::linalg)
  if(EXISTS ${SCIENCE_FOUNDATIONS}/calx/CMakeLists.txt)
    add_subdirectory(${SCIENCE_FOUNDATIONS}/calx ${CMAKE_CURRENT_BINARY_DIR}/calx)
  else()
    message(FATAL_ERROR "the neuroscience domain needs calx: build it inside The Science Infrastructures")
  endif()
endif()
if(NOT TARGET physis::dynamics)
  add_subdirectory(${SCIENCE_FOUNDATIONS}/physis ${CMAKE_CURRENT_BINARY_DIR}/physis)
endif()
if(NEUROSCIENCE_CHECKS)
  enable_testing()
endif()

add_subdirectory(snn)
