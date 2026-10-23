// The statistics of spike trains: what a population's recorded activity was.
//
// For the spikes of N neurons in a window [t0, t1) of length T:
//
// - rates: each neuron's count over T, and their mean and spread;
// - irregularity: the coefficient of variation of each neuron's interspike intervals,
//   CV = sd / mean (1 for a Poisson process, 0 for a clock; Softky and Koch 1993; Holt et al.
//   1996), and the local variation of successive intervals,
//   LV = 3 / (n - 1) sum_i ((I_i - I_{i+1}) / (I_i + I_{i+1}))^2 over n intervals, also 1 for
//   Poisson and 0 for a clock but blind to slow changes of rate (Shinomoto, Shima and Tanji
//   2003), each the mean over the neurons with at least three spikes;
// - count variability: the Fano factor (Fano 1947) of each neuron's counts in windows of
//   length W, variance over mean (1 for Poisson), the mean over neurons that fire;
// - synchrony: Golomb's chi (2007) on the neurons' counts c_i(t) in bins of length B,
//   chi^2 = Var_t((1/N) sum_i c_i) / ((1/N) sum_i Var_t(c_i)), which is 1 when all fire
//   together and about 1 / sqrt(N) when they fire independently; and the mean Pearson
//   correlation of counts in windows of length W over a fixed sample of pairs (drawn with
//   replacement);
// - the population's rate in bins of length b, and its power spectrum by Welch's method
//   (calx/signal), whose highest peak is the population's rhythm;
// - histograms of the interspike intervals (logarithmic bins) and of the rates.
//
// Every quantity is in SI units: times in seconds, rates in hertz, spectral density in Hz^2/Hz.

#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <numeric>
#include <vector>

#include <calx/random/stream.hpp>
#include <calx/signal/spectrum.hpp>

namespace neuroscience::snn::analysis {

constexpr double nan = std::numeric_limits<double>::quiet_NaN();

// The spikes of neurons 0 .. neurons-1, times in seconds (any order).
struct Spikes {
  std::size_t neurons = 0;
  std::vector<double> times;
  std::vector<std::uint32_t> senders;
};

struct Options {
  double start = 0, stop = 0;  // the window; stop <= start: to the last spike's step
  double bin = 1e-3;           // b: the population's rate, and its spectrum
  double window = 0.1;         // W: Fano factors and correlations of counts
  double sync_bin = 5e-3;      // B: Golomb's chi
  std::size_t pairs = 400;     // the pairs sampled for correlations
};

struct Histogram {
  std::vector<double> edges;           // edges.size() = counts.size() + 1
  std::vector<std::uint64_t> counts;
};

struct Description {
  std::size_t neurons = 0, spikes = 0, active = 0, irregular = 0, fano_neurons = 0, pairs = 0;
  double start = 0, stop = 0;
  double rate_mean = nan, rate_sd = nan;   // Hz, over all neurons
  double cv = nan, lv = nan;               // means over neurons with >= 3 spikes
  double fano = nan, chi = nan, correlation = nan;
  double peak_frequency = nan, peak_density = nan;
  std::vector<double> rates;               // each neuron's rate, Hz
  std::vector<double> rate_times, rate;    // the population's rate, Hz, at bin centres
  calx::signal::Spectrum spectrum;         // of the population's rate
  Histogram isi, rate_histogram;
};

namespace detail {

// Each neuron's spike times in [a, b), sorted.
inline std::vector<std::vector<double>> trains(const Spikes& s, double a, double b) {
  std::vector<std::vector<double>> out(s.neurons);
  for (std::size_t k = 0; k < s.times.size(); k++)
    if (s.senders[k] < s.neurons && s.times[k] >= a && s.times[k] < b) out[s.senders[k]].push_back(s.times[k]);
  for (auto& t : out) std::sort(t.begin(), t.end());
  return out;
}

// Counts of one train in bins of width w over [a, a + n w).
inline std::vector<double> counts(const std::vector<double>& t, double a, double w, std::size_t n) {
  std::vector<double> c(n, 0.0);
  for (double x : t) {
    const auto k = static_cast<std::size_t>((x - a) / w);
    if (k < n) c[k] += 1;
  }
  return c;
}

inline double mean(const std::vector<double>& x) { return x.empty() ? nan : std::accumulate(x.begin(), x.end(), 0.0) / static_cast<double>(x.size()); }
inline double variance(const std::vector<double>& x) {
  if (x.size() < 2) return nan;
  const double m = mean(x);
  double v = 0;
  for (double y : x) v += (y - m) * (y - m);
  return v / static_cast<double>(x.size());
}

}  // namespace detail

// Logarithmic bins from lo to hi.
inline Histogram log_histogram(const std::vector<double>& x, double lo, double hi, std::size_t bins) {
  Histogram h;
  for (std::size_t k = 0; k <= bins; k++) h.edges.push_back(lo * std::pow(hi / lo, static_cast<double>(k) / static_cast<double>(bins)));
  h.counts.assign(bins, 0);
  for (double v : x) {
    if (!(v >= lo && v < hi)) continue;
    const auto k = static_cast<std::size_t>(std::log(v / lo) / std::log(hi / lo) * static_cast<double>(bins));
    h.counts[std::min(k, bins - 1)]++;
  }
  return h;
}

inline Histogram linear_histogram(const std::vector<double>& x, double lo, double hi, std::size_t bins) {
  Histogram h;
  for (std::size_t k = 0; k <= bins; k++) h.edges.push_back(lo + (hi - lo) * static_cast<double>(k) / static_cast<double>(bins));
  h.counts.assign(bins, 0);
  for (double v : x) {
    if (!(v >= lo && v <= hi)) continue;
    const auto k = static_cast<std::size_t>((v - lo) / (hi - lo) * static_cast<double>(bins));
    h.counts[std::min(k, bins - 1)]++;
  }
  return h;
}

inline Description describe(const Spikes& s, const Options& o) {
  Description d;
  d.neurons = s.neurons;
  d.start = o.start;
  d.stop = o.stop > o.start ? o.stop : (s.times.empty() ? o.start : *std::max_element(s.times.begin(), s.times.end()) + 1e-12);
  const double T = d.stop - d.start;
  if (s.neurons == 0 || !(T > 0)) return d;
  const auto t = detail::trains(s, d.start, d.stop);

  // ---- rates
  d.rates.resize(s.neurons);
  for (std::size_t i = 0; i < s.neurons; i++) {
    d.rates[i] = static_cast<double>(t[i].size()) / T;
    d.spikes += t[i].size();
    d.active += !t[i].empty();
  }
  d.rate_mean = detail::mean(d.rates);
  d.rate_sd = s.neurons > 1 ? std::sqrt(detail::variance(d.rates) * static_cast<double>(s.neurons) / static_cast<double>(s.neurons - 1)) : 0;
  const double top = *std::max_element(d.rates.begin(), d.rates.end());
  d.rate_histogram = linear_histogram(d.rates, 0, top > 0 ? top : 1, 30);

  // ---- intervals
  std::vector<double> all, cvs, lvs;
  for (const auto& x : t) {
    if (x.size() < 3) continue;
    std::vector<double> I;
    for (std::size_t k = 1; k < x.size(); k++) I.push_back(x[k] - x[k - 1]);
    all.insert(all.end(), I.begin(), I.end());
    const double m = detail::mean(I);
    double v = 0;
    for (double y : I) v += (y - m) * (y - m);
    cvs.push_back(std::sqrt(v / static_cast<double>(I.size() - 1)) / m);
    double l = 0;
    for (std::size_t k = 0; k + 1 < I.size(); k++) { const double q = (I[k] - I[k + 1]) / (I[k] + I[k + 1]); l += q * q; }
    lvs.push_back(3 * l / static_cast<double>(I.size() - 1));
  }
  d.irregular = cvs.size();
  d.cv = detail::mean(cvs);
  d.lv = detail::mean(lvs);
  d.isi = log_histogram(all, 1e-4, 10.0, 60);

  // ---- Fano factors and correlations, in windows of W
  const auto nw = static_cast<std::size_t>(std::floor(T / o.window + 1e-9));
  if (nw >= 2) {
    std::vector<std::vector<double>> c(s.neurons);
    std::vector<double> fanos;
    for (std::size_t i = 0; i < s.neurons; i++) {
      c[i] = detail::counts(t[i], d.start, o.window, nw);
      const double m = detail::mean(c[i]);
      if (m > 0) fanos.push_back(detail::variance(c[i]) / m);
    }
    d.fano_neurons = fanos.size();
    d.fano = detail::mean(fanos);
    // A fixed sample of distinct pairs, from a stream of its own.
    std::vector<double> rs;
    if (s.neurons >= 2) {
      calx::random::Stream z(0x5A11, static_cast<std::uint32_t>(s.neurons), 0, 0);
      const std::size_t total = s.neurons * (s.neurons - 1) / 2;
      const std::size_t want = std::min(o.pairs, total);
      // Pairs drawn with replacement; a pair whose counts never vary has no correlation.
      for (std::size_t drawn = 0, tries = 0; drawn < want && tries < 20 * want; tries++) {
        const auto i = static_cast<std::size_t>(z.uniform() * static_cast<double>(s.neurons));
        const auto j = static_cast<std::size_t>(z.uniform() * static_cast<double>(s.neurons));
        if (i == j) continue;
        drawn++;
        const double mi = detail::mean(c[i]), mj = detail::mean(c[j]);
        double sij = 0, sii = 0, sjj = 0;
        for (std::size_t w = 0; w < nw; w++) { sij += (c[i][w] - mi) * (c[j][w] - mj); sii += (c[i][w] - mi) * (c[i][w] - mi); sjj += (c[j][w] - mj) * (c[j][w] - mj); }
        if (sii > 0 && sjj > 0) rs.push_back(sij / std::sqrt(sii * sjj));
      }
    }
    d.pairs = rs.size();
    d.correlation = detail::mean(rs);
  }

  // ---- Golomb's chi, in bins of B
  const auto nb = static_cast<std::size_t>(std::floor(T / o.sync_bin + 1e-9));
  if (nb >= 2) {
    std::vector<double> pop(nb, 0.0);
    double vsum = 0;
    for (std::size_t i = 0; i < s.neurons; i++) {
      const auto ci = detail::counts(t[i], d.start, o.sync_bin, nb);
      for (std::size_t k = 0; k < nb; k++) pop[k] += ci[k] / static_cast<double>(s.neurons);
      vsum += detail::variance(ci);
    }
    const double vi = vsum / static_cast<double>(s.neurons);
    if (vi > 0) d.chi = std::sqrt(detail::variance(pop) / vi);
  }

  // ---- the population's rate and its spectrum
  const auto nr = static_cast<std::size_t>(std::floor(T / o.bin + 1e-9));
  if (nr >= 2) {
    d.rate.assign(nr, 0.0);
    for (const auto& x : t)
      for (double y : x) {
        const auto k = static_cast<std::size_t>((y - d.start) / o.bin);
        if (k < nr) d.rate[k] += 1.0 / (static_cast<double>(s.neurons) * o.bin);
      }
    for (std::size_t k = 0; k < nr; k++) d.rate_times.push_back(d.start + (static_cast<double>(k) + 0.5) * o.bin);
    if (nr >= 16) {
      // Segments of a power of two, at most a quarter of the series (seven half-overlapping
      // segments or more), at least 16 samples.
      std::size_t L = 16;
      while (L * 2 <= nr / 4) L *= 2;
      d.spectrum = calx::signal::welch(d.rate, 1 / o.bin, L);
      for (std::size_t k = 1; k < d.spectrum.density.size(); k++)
        if (!(d.spectrum.density[k] <= d.peak_density)) { d.peak_density = d.spectrum.density[k]; d.peak_frequency = d.spectrum.frequency[k]; }
    }
  }
  return d;
}

}  // namespace neuroscience::snn::analysis
